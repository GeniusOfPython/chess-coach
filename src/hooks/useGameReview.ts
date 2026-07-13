import { useState } from "react";
import type { GameReviewItem, GameReviewStatus } from "../components/GameReviewPanel";

export function useGameReview() {
  const [status, setStatus] = useState<GameReviewStatus>("idle");
  const [items, setItems] = useState<GameReviewItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  function reset() {
    setStatus("idle");
    setItems([]);
    setProgress(0);
    setError("");
  }

  return { status, setStatus, items, setItems, progress, setProgress, error, setError, reset };
}
