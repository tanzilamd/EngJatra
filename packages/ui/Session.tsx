import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { demo, supabase } from "../data/auth";
import { Auth, PasswordRecovery } from "./Auth";
import { Loading } from "./components";
const SessionContext = createContext<{
  user: User | null;
  loading: boolean;
  recovery: boolean;
  finishRecovery: () => void;
}>({
  user: null,
  loading: true,
  recovery: false,
  finishRecovery: () => undefined,
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    supabase.auth
      .getSession()
      .then((result) => {
        if (alive) {
          setUser(result.data.session?.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
    <SessionContext.Provider
      value={{
        user,
        loading,
        recovery,
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
  if (session.loading)
    return (
      <main className="onboard">
        <Loading label="অ্যাকাউন্ট খুলছি…" />
      </main>
    );
  if (!session.user && !started)
    return (
      <Auth
        admin={admin}
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
