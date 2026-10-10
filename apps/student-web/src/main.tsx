import { PwaExperience } from "./Pwa";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../../../packages/ui/components";
import "../../../packages/ui/styles.css";
import { lazy, Suspense } from "react";
import { ApplicationGate, SessionProvider } from "../../../packages/ui/Session";
import { Loading } from "../../../packages/ui/components";
const App = lazy(() => import("./App"));
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <SessionProvider>
      <ApplicationGate signedOutExtras={<PwaExperience engaged={false} />}>
        <Suspense
          fallback={
            <main className="onboard">
              <Loading />
            </main>
          }
        >
          <App />
        </Suspense>
      </ApplicationGate>
    </SessionProvider>
  </ErrorBoundary>,
);

if (
  import.meta.env.PROD &&
  import.meta.env.MODE !== "demo" &&
  "serviceWorker" in navigator
) {
  // Do not compete with the first rendered Auth page/fonts for slow-network
  // bandwidth. Still install promptly; idle has a bounded fallback and browsers
  // without requestIdleCallback wait only for their load event.
  const register = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => window.dispatchEvent(new Event("engjatra-worker-ready")))
      .catch(() => undefined);
  };
  const afterLoad = () => {
    if ("requestIdleCallback" in window)
      window.requestIdleCallback(register, { timeout: 5000 });
    else setTimeout(register, 0);
  };
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
}
