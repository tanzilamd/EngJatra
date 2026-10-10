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
      <ApplicationGate admin>
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
