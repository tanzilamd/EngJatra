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
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => window.dispatchEvent(new Event("engjatra-worker-ready")))
    .catch(() => undefined);
}
