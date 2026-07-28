import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App.tsx";
import "./theme.css";
import ErrorBoundary from "./components/ErrorBoundary";
import SystemStatusLayer from "./components/SystemStatusLayer";
import { recoverCorruptedAppStorage } from "./platform/appStorageHealth";
import { installGlobalErrorHandlers } from "./platform/diagnostics/globalErrorHandlers";
import { registerServiceWorker } from "./platform/registerServiceWorker";
import { initializeAppStoragePersistence } from "./platform/storageMigration";
import { isNativeMobileShell } from "./platform/mobile";

installGlobalErrorHandlers();

async function startApplication() {
  const nativeRuntime = isNativeMobileShell()
    ? await import("./platform/nativeRuntime")
    : null;

  await nativeRuntime?.initializeNativeRuntime();
  await initializeAppStoragePersistence();
  const storageRecovery = recoverCorruptedAppStorage();
  registerServiceWorker();

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <>
        <App />
        <SystemStatusLayer storageRecovery={storageRecovery} />
      </>
    </ErrorBoundary>,
  );

  window.requestAnimationFrame(() => {
    void nativeRuntime?.finishNativeLaunch();
  });
}

void startApplication();
