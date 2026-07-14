import { useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import PwaUpdateNotice from "./PwaUpdateNotice";
import "./SystemStatusLayer.css";

const restoredNoticeDurationMs = 3200;

export default function SystemStatusLayer() {
  const networkStatus = useNetworkStatus();
  const wasOfflineRef = useRef(networkStatus === "offline");
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    if (networkStatus === "offline") {
      wasOfflineRef.current = true;
      setShowRestoredNotice(false);
      return;
    }

    if (!wasOfflineRef.current) {
      return;
    }

    wasOfflineRef.current = false;
    setShowRestoredNotice(true);

    const timer = window.setTimeout(() => {
      setShowRestoredNotice(false);
    }, restoredNoticeDurationMs);

    return () => window.clearTimeout(timer);
  }, [networkStatus]);

  return (
    <div className="system-status-layer">
      {networkStatus === "offline" && (
        <aside
          className="connectivity-notice connectivity-notice--offline"
          role="status"
          aria-live="polite"
        >
          <span className="connectivity-notice__indicator" aria-hidden="true" />
          <span className="connectivity-notice__content">
            <strong>Офлайн-режим</strong>
            <span>Партия и базовый анализ доступны.</span>
          </span>
        </aside>
      )}

      {showRestoredNotice && (
        <aside
          className="connectivity-notice connectivity-notice--restored"
          role="status"
          aria-live="polite"
        >
          <span className="connectivity-notice__indicator" aria-hidden="true" />
          <strong>Соединение восстановлено</strong>
        </aside>
      )}

      <PwaUpdateNotice />
    </div>
  );
}
