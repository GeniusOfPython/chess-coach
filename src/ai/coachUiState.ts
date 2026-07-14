export type AiCoachAction = {
  label: string;
  disabled: boolean;
} | null;

export function getAiCoachAction({
  enabled,
  isOnline,
  status,
  remaining,
}: {
  enabled: boolean;
  isOnline: boolean;
  status: "idle" | "loading" | "success" | "limited" | "error";
  remaining: number;
}): AiCoachAction {
  if (status === "loading" || remaining <= 0) {
    return null;
  }

  if (!enabled) {
    return { label: "ИИ-тренер не подключён", disabled: true };
  }

  if (!isOnline) {
    return { label: "Нет подключения к интернету", disabled: true };
  }

  if (status === "success") {
    return { label: "Обновить ИИ-разбор", disabled: false };
  }

  if (status === "error" || status === "limited") {
    return { label: "Попробовать снова", disabled: false };
  }

  return { label: "Спросить ИИ-тренера", disabled: false };
}
