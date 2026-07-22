export type BoardThemeId = "sunset" | "cyber" | "ultraviolet";

export type BoardTheme = {
  id: BoardThemeId;
  name: string;
  description: string;
  lightSquare: string;
  darkSquare: string;
  previewLight: string;
  previewDark: string;
  shadow: string;
};

export const DEFAULT_BOARD_THEME: BoardThemeId = "sunset";

export const BOARD_THEMES = [
  {
    id: "sunset",
    name: "Sunset",
    description: "Розовый закат и тёплый неон",
    lightSquare: "#f6c7e8",
    darkSquare: "#a855c7",
    previewLight: "#f6c7e8",
    previewDark: "#a855c7",
    shadow:
      "0 20px 54px rgba(0, 0, 0, 0.48), 0 0 30px rgba(255, 60, 172, 0.18), 0 0 20px rgba(0, 229, 255, 0.12)",
  },
  {
    id: "cyber",
    name: "Cyber",
    description: "Холодный cyan и глубокий индиго",
    lightSquare: "#b9e9f2",
    darkSquare: "#3766a8",
    previewLight: "#b9e9f2",
    previewDark: "#3766a8",
    shadow:
      "0 20px 54px rgba(0, 0, 0, 0.5), 0 0 32px rgba(0, 229, 255, 0.2), 0 0 18px rgba(83, 112, 255, 0.16)",
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    description: "Светлая лаванда и ночной фиолетовый",
    lightSquare: "#ded1ff",
    darkSquare: "#6846a5",
    previewLight: "#ded1ff",
    previewDark: "#6846a5",
    shadow:
      "0 20px 54px rgba(0, 0, 0, 0.5), 0 0 34px rgba(166, 96, 255, 0.22), 0 0 18px rgba(255, 60, 172, 0.12)",
  },
] as const satisfies readonly BoardTheme[];

export function parseBoardThemeId(value: string | null): BoardThemeId {
  return BOARD_THEMES.some((theme) => theme.id === value)
    ? (value as BoardThemeId)
    : DEFAULT_BOARD_THEME;
}

export function getBoardTheme(themeId: BoardThemeId): BoardTheme {
  return BOARD_THEMES.find((theme) => theme.id === themeId) ?? BOARD_THEMES[0];
}
