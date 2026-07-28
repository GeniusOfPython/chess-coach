export const nativeRuntimeEvents = {
  resume: "chess-coach:native-resume",
  back: "chess-coach:native-back",
  deepLink: "chess-coach:native-deep-link",
} as const;

export function addNativeResumeListener(listener: () => void) {
  window.addEventListener(nativeRuntimeEvents.resume, listener);
  return () => window.removeEventListener(nativeRuntimeEvents.resume, listener);
}

export function addNativeBackHandler(handler: () => boolean) {
  const listener = (event: Event) => {
    if (handler()) {
      event.preventDefault();
    }
  };

  window.addEventListener(nativeRuntimeEvents.back, listener);
  return () => window.removeEventListener(nativeRuntimeEvents.back, listener);
}

export function dispatchNativeDeepLink(url: string) {
  window.dispatchEvent(new CustomEvent(nativeRuntimeEvents.deepLink, {
    detail: { url },
  }));
}

export function addNativeDeepLinkListener(listener: (url: string) => void) {
  const eventListener = (event: Event) => {
    const url = (event as CustomEvent<{ url?: unknown }>).detail?.url;

    if (typeof url === "string") {
      listener(url);
    }
  };

  window.addEventListener(nativeRuntimeEvents.deepLink, eventListener);
  return () => window.removeEventListener(nativeRuntimeEvents.deepLink, eventListener);
}
