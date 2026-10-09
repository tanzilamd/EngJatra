import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../../../packages/ui/components";
import "../../../packages/ui/styles.css";
import App from "./App";
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

if (
  import.meta.env.PROD &&
  import.meta.env.MODE !== "demo" &&
  "serviceWorker" in navigator
) {
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}
