import { useEffect, useRef, useState } from "react";
import {
  applyPwaUpdate,
  PWA_UPDATE_READY_EVENT,
} from "../platform/pwaUpdate";
import "./PwaUpdateNotice.css";

export default function PwaUpdateNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const shouldReloadRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const showNotice = () => setIsVisible(true);
    const reloadAfterUpdate = () => {
      if (shouldReloadRef.current) {
        window.location.reload();
      }
    };

    window.addEventListener(PWA_UPDATE_READY_EVENT, showNotice);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadAfterUpdate,
    );

    void navigator.serviceWorker.getRegistration("/").then((registration) => {
      if (registration?.waiting && navigator.serviceWorker.controller) {
        showNotice();
      }
    });

    return () => {
      window.removeEventListener(PWA_UPDATE_READY_EVENT, showNotice);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        reloadAfterUpdate,
      );
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    shouldReloadRef.current = true;

    try {
      const updateStarted = await applyPwaUpdate();

      if (!updateStarted) {
        shouldReloadRef.current = false;
        setIsUpdating(false);
        setIsVisible(false);
      }
    } catch {
      shouldReloadRef.current = false;
      setIsUpdating(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="pwa-update-notice" role="status" aria-live="polite">
      <div className="pwa-update-notice__content">
        <strong>Доступна новая версия</strong>
        <span>Обновление займёт несколько секунд.</span>
      </div>
      <button
        className="pwa-update-notice__action"
        type="button"
        disabled={isUpdating}
        onClick={() => void handleUpdate()}
      >
        {isUpdating ? "Обновляем…" : "Обновить"}
      </button>
    </aside>
  );
}
