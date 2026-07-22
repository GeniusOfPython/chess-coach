import { captureException } from "./crashReporter";

type ErrorEventTarget = Pick<Window, "addEventListener" | "removeEventListener">;

export function installGlobalErrorHandlers(target: ErrorEventTarget = window) {
  const handleError = (event: ErrorEvent) => {
    captureException(event.error ?? new Error(event.message), {
      source: "window-error",
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    captureException(event.reason, {
      source: "unhandled-rejection",
    });
  };

  target.addEventListener("error", handleError as EventListener);
  target.addEventListener(
    "unhandledrejection",
    handleUnhandledRejection as EventListener,
  );

  return () => {
    target.removeEventListener("error", handleError as EventListener);
    target.removeEventListener(
      "unhandledrejection",
      handleUnhandledRejection as EventListener,
    );
  };
}
