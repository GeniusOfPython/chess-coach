import { useEffect, useRef, useState } from "react";
import type { RewardToastMessage } from "../components/RewardToast";

export function useRewardToast() {
  const [message, setMessage] = useState<RewardToastMessage | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  function showRewardToast(next: Omit<RewardToastMessage, "id">) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setMessage({ ...next, id: Date.now() });
    timerRef.current = window.setTimeout(() => {
      setMessage(null);
      timerRef.current = null;
    }, 4200);
  }

  return { message, showRewardToast };
}
