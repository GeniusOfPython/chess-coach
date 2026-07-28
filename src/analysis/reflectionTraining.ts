export type AiReflectionTrainingInput = {
  answer: string;
  question: string;
};

export type AiReflectionTrainingContext = {
  kind: "ai_reflection";
  answer: string;
  question: string;
};

export function createAiReflectionTrainingContext(
  input: AiReflectionTrainingInput,
): AiReflectionTrainingContext | null {
  const answer = input.answer.trim();
  const question = input.question.trim();

  if (!answer || !question) {
    return null;
  }

  return {
    kind: "ai_reflection",
    answer,
    question,
  };
}
