import { createRoot } from "react-dom/client";
import "./index.css";
import "./mobile.css";
import App from "./App.tsx";
import { registerServiceWorker } from "./platform/registerServiceWorker";

createRoot(document.getElementById("root")!).render(
  <App />,
);

registerServiceWorker();
