import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export type ShareTextResult = "shared" | "copied" | "unavailable";

export function canShareText() {
  return Capacitor.isNativePlatform() || typeof navigator.share === "function";
}

export async function shareText({
  title,
  text,
}: {
  title: string;
  text: string;
}): Promise<ShareTextResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title, text, dialogTitle: title });
      return "shared";
    } catch (error) {
      console.warn("Нативный системный share недоступен:", error);
    }
  } else if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "unavailable";
      }
      console.warn("Web Share недоступен:", error);
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "unavailable";
  }
}
