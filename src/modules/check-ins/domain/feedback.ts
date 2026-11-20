export type FeedbackAnswer = {
  questionTextSnapshot: string;
  optionLabelSnapshot: string;
  directionValueSnapshot: number | null;
  sortOrder: number;
};

export function buildBaselineFeedback(answers: FeedbackAnswer[]): string[] {
  return answers
    .filter((answer): answer is FeedbackAnswer & { directionValueSnapshot: number } =>
      answer.directionValueSnapshot !== null,
    )
    .sort(
      (left, right) =>
        right.directionValueSnapshot - left.directionValueSnapshot ||
        left.sortOrder - right.sortOrder,
    )
    .slice(0, 2)
    .map(
      (answer) =>
        `For “${answer.questionTextSnapshot}”, you reported “${answer.optionLabelSnapshot}”.`,
    );
}
