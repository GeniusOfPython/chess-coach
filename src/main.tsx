import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import "./theme.css";
import ErrorBoundary from "./components/ErrorBoundary";
import SystemStatusLayer from "./components/SystemStatusLayer";
import { registerServiceWorker } from "./platform/registerServiceWorker";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <>
      <App />
      <SystemStatusLayer />
    </>
  </ErrorBoundary>,
);
