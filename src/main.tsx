import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import PwaUpdateNotice from "./components/PwaUpdateNotice";
import { registerServiceWorker } from "./platform/registerServiceWorker";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <>
      <App />
      <PwaUpdateNotice />
    </>
  </ErrorBoundary>,
);
