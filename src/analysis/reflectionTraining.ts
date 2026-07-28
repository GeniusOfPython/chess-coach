export type AiReflectionTrainingInput = {
  answer: string;
  question: string;
  reflectionKey: string;
};

export type AiReflectionTrainingContext = {
  kind: "ai_reflection";
  answer: string;
  question: string;
  reflectionKey: string;
};

export function createAiReflectionTrainingContext(
  input: AiReflectionTrainingInput,
): AiReflectionTrainingContext | null {
  const answer = input.answer.trim();
  const question = input.question.trim();
  const reflectionKey = input.reflectionKey.trim();

  if (!answer || !question || !reflectionKey) {
    return null;
  }

  return {
    kind: "ai_reflection",
    answer,
    question,
    reflectionKey,
  };
}
