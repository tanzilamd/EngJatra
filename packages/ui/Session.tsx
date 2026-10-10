import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { configured, demo, initializeSupabase } from "../data/auth";
import { Auth, PasswordRecovery } from "./Auth";
import { Loading } from "./components";
const SessionContext = createContext<{
  user: User | null;
  loading: boolean;
  recovery: boolean;
  finishRecovery: () => void;
  expected: boolean;
  failed: boolean;
}>({
  user: null,
  loading: true,
  recovery: false,
  finishRecovery: () => undefined,
  expected: false,
  failed: false,
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured && !demo);
  const [recovery, setRecovery] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expected] = useState(() => {
    try {
      const project = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(
        ".",
      )[0];
      return (
        !!localStorage.getItem(`sb-${project}-auth-token`) ||
        /access_token=|[?&]code=/.test(location.hash + location.search)
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    void initializeSupabase()
      .then(async (client) => {
        if (!alive || !client) return;
        const { data } = client.auth.onAuthStateChange((event, session) => {
          if (!alive) return;
          setUser(session?.user.email_confirmed_at ? session.user : null);
          setLoading(false);
          if (event === "PASSWORD_RECOVERY") setRecovery(true);
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const result = await client.auth.getSession();
        if (alive) {
          const candidate = result.data.session?.user;
          setUser(candidate?.email_confirmed_at ? candidate : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          setFailed(true);
        }
      });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);
  return (
    <SessionContext.Provider
      value={{
        user,
        loading,
        recovery,
        expected,
        failed,
        finishRecovery: () => {
          setRecovery(false);
          window.history.replaceState(null, "", "/");
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
export function ApplicationGate({
  children,
  admin = false,
  signedOutExtras,
}: {
  signedOutExtras?: ReactNode;
  children: ReactNode;
  admin?: boolean;
}) {
  const session = useSession();
  const [started, setStarted] = useState(
    () =>
      demo &&
      (admin
        ? sessionStorage.getItem("engjatra.admin.started") === "yes"
        : !!localStorage.getItem("engjatra.demo.started")),
  );
  if (session.recovery)
    return <PasswordRecovery admin={admin} onDone={session.finishRecovery} />;
  if (session.loading && session.expected)
    return (
      <main className="onboard">
        <Loading label="অ্যাকাউন্ট খুলছি…" />
      </main>
    );
  if (!session.user && !started)
    return (
      <Auth
        admin={admin}
        ready={!session.loading}
        connectionFailed={session.failed}
        extras={signedOutExtras}
        onDemo={() => {
          if (!demo) return;
          if (admin) sessionStorage.setItem("engjatra.admin.started", "yes");
          else localStorage.setItem("engjatra.demo.started", "1");
          localStorage.setItem(
            "engjatra.demo.user",
            admin ? "staff" : "learner",
          );
          localStorage.setItem(
            "engjatra.demo.role",
            admin ? "admin" : "learner",
          );
          setStarted(true);
        }}
      />
    );
  return children;
}
