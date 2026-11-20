import { MessageCircleMore } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MentorConversationRequest } from "@/generated/prisma/client";

export const conversationLabels = {
  YES: "Conversation requested",
  MAYBE: "Conversation might help",
  NO: "No conversation requested",
} satisfies Record<MentorConversationRequest, string>;

export function ConversationState({ state }: { state: MentorConversationRequest }) {
  return (
    <Badge variant="outline">
      <MessageCircleMore aria-hidden="true" />
      {conversationLabels[state]}
    </Badge>
  );
}
