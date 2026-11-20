import type { MentorConversationRequest, ObservationStatus, ObservationType } from "@/generated/prisma/client";

export type AttentionState = "NORMAL" | "WATCH" | "CONVERSATION";
export const observationPriority = ["CONVERSATION_REQUEST", "WORSENING_PATTERN", "REPEATED_DIFFICULTY", "IMPROVEMENT"] as const;
export type AttentionObservation = { id: string; type: ObservationType; status: ObservationStatus; title: string; lastDetectedAt: Date };

export function deriveObservationAttention(observations: AttentionObservation[], recentSignal: MentorConversationRequest | null) {
  const active = observations.filter(({ status }) => status !== "RESOLVED");
  const ordered = observationPriority.flatMap((type) => active.filter((item) => item.type === type)
    .sort((a, b) => b.lastDetectedAt.getTime() - a.lastDetectedAt.getTime() || a.id.localeCompare(b.id)));
  const conversation = recentSignal === "YES" || active.some(({ type }) => type === "CONVERSATION_REQUEST");
  const watch = active.some(({ type }) => type === "REPEATED_DIFFICULTY" || type === "WORSENING_PATTERN");
  const attentionState: AttentionState = conversation ? "CONVERSATION" : watch ? "WATCH" : "NORMAL";
  const attention = conversation ? "CONVERSATION_REQUESTED" as const : watch ? "OBSERVATION" as const
    : recentSignal === "MAYBE" ? "MAYBE_CONVERSATION" as const
      : active.some(({ type }) => type === "IMPROVEMENT") ? "IMPROVEMENT" as const : "NO_CURRENT_SIGNAL" as const;
  return { attentionState, attention, observation: ordered[0] ?? null };
}
