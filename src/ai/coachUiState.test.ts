import { describe, expect, it } from "vitest";
import { getAiCoachAction } from "./coachUiState";

describe("AI Coach action state", () => {
  it("показывает основное действие в начальном состоянии", () => {
    expect(getAiCoachAction({
      enabled: true,
      isOnline: true,
      status: "idle",
      remaining: 3,
    })).toEqual({ label: "Спросить ИИ-тренера", disabled: false });
  });

  it("не оставляет панель без действия после ответа или временной ошибки", () => {
    expect(getAiCoachAction({
      enabled: true,
      isOnline: true,
      status: "success",
      remaining: 2,
    })?.label).toBe("Обновить ИИ-разбор");
    expect(getAiCoachAction({
      enabled: true,
      isOnline: true,
      status: "error",
      remaining: 2,
    })?.label).toBe("Попробовать снова");
    expect(getAiCoachAction({
      enabled: true,
      isOnline: true,
      status: "limited",
      remaining: 2,
    })?.label).toBe("Попробовать снова");
  });

  it("явно объясняет выключенное и офлайн-состояние", () => {
    expect(getAiCoachAction({
      enabled: false,
      isOnline: true,
      status: "idle",
      remaining: 3,
    })).toEqual({ label: "ИИ-тренер не подключён", disabled: true });
    expect(getAiCoachAction({
      enabled: true,
      isOnline: false,
      status: "idle",
      remaining: 3,
    })).toEqual({
      label: "Нет подключения к интернету",
      disabled: true,
    });
  });

  it("скрывает действие во время загрузки и после исчерпания квоты", () => {
    expect(getAiCoachAction({
      enabled: true,
      isOnline: true,
      status: "loading",
      remaining: 3,
    })).toBeNull();
    expect(getAiCoachAction({
      enabled: true,
      isOnline: true,
      status: "limited",
      remaining: 0,
    })).toBeNull();
  });
});
