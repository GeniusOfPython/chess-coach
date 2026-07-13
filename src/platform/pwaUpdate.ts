export const PWA_UPDATE_READY_EVENT = "chess-coach:pwa-update-ready";

export function announcePwaUpdateReady() {
  window.dispatchEvent(new Event(PWA_UPDATE_READY_EVENT));
}

export async function applyPwaUpdate() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration?.waiting) {
    return false;
  }

  registration.waiting.postMessage("SKIP_WAITING");
  return true;
}
