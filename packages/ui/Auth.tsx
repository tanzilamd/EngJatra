import { useEffect, useId, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import { demo, supabase, configured } from "../data/auth";
import { Notice } from "./components";
import { ThemePicker } from "./Theme";
function AuthLayout({
  children,
  admin = false,
  extras,
}: {
  extras?: ReactNode;
  children: ReactNode;
  admin?: boolean;
}) {
  return (
    <main className={`auth-shell ${admin ? "auth-admin" : ""}`}>
      <header className="auth-header">
        <a className="brand" href="/" aria-label="EngJatra">
          <img src="/brand/logo-mark.svg" alt="" width="40" height="40" />
          <span lang="en">EngJatra</span>
          {admin && <span className="tag">প্রশাসন</span>}
        </a>
        <ThemePicker compact />
      </header>
      <div className="auth-layout">
        <aside
          className="auth-story"
          aria-label={admin ? "নিরাপদ প্রশাসন" : "শেখার যাত্রা"}
        >
          <span className="auth-kicker">
            <BookOpen size={18} />
            {admin
              ? "যত্নে গড়ে উঠুক শেখার জায়গা"
              : "বাংলায় বুঝি, ইংরেজিতে এগোই"}
          </span>
          <h2>
            {admin ? (
              <>
                ভালো শেখার অভিজ্ঞতা,
                <br />
                আপনার হাত ধরেই।
              </>
            ) : (
              <>
                ছোট ছোট পাঠ।
                <br />
                বড় হওয়ার আত্মবিশ্বাস।
              </>
            )}
          </h2>
          <p>
            {admin
              ? "পাঠ সম্পাদনা, শিক্ষার্থীদের মতামত ও প্রকাশনার কাজ—একটি আলাদা, সুরক্ষিত কর্মক্ষেত্রে।"
              : "শুরুটা যেখানেই হোক, প্রতিদিন একটু শেখাই এগিয়ে যাওয়ার পথ। তোমার গতিতে, তোমার মতো করে।"}
          </p>
          <div className="journey-visual" aria-hidden="true">
            <div className="journey-line" />
            <div className="journey-stop done">
              <Check size={22} />
              <span>শুরু</span>
            </div>
            <div className="journey-stop current">
              <BookOpen size={24} />
              <span>অনুশীলন</span>
            </div>
            <div className="journey-stop">
              <ArrowRight size={22} />
              <span>এগিয়ে চলা</span>
            </div>
          </div>
          <div className="auth-facts">
            <span>
              <Check size={17} />
              বাংলায় সহজ ব্যাখ্যা
            </span>
            <span>
              <Check size={17} />
              ৬টি শেখার পথ, ৯৬টি পাঠ
            </span>
            <span>
              <Check size={17} />
              নিজের অগ্রগতি নিজের কাছে
            </span>
          </div>
        </aside>
        <section className="auth-panel">{children}</section>
      </div>
      {extras && (
        <aside className="auth-notices" aria-label="সংযোগ ও আপডেট">
          {extras}
        </aside>
      )}
      <footer className="auth-footer">
        <ShieldCheck size={15} />
        প্রয়োজনীয় তথ্যই সংরক্ষণ করা হয়। AI অনুশীলনে পাঠানো লেখা সেবা প্রদানকারী
        প্রক্রিয়া করে।
      </footer>
    </main>
  );
}
function PasswordField({
  value,
  onChange,
  signup = false,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  signup?: boolean;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>পাসওয়ার্ড</label>
      <div className="password-field">
        <input
          id={id}
          name="password"
          type={show ? "text" : "password"}
          autoComplete={signup ? "new-password" : "current-password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : signup ? `${id}-hint` : undefined
          }
        />
        <button
          type="button"
          className="quiet"
          aria-label={show ? "পাসওয়ার্ড লুকাও" : "পাসওয়ার্ড দেখাও"}
          aria-pressed={show}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {error ? (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      ) : (
        signup && (
          <span className="small muted" id={`${id}-hint`}>
            অন্তত ৮টি অক্ষর ব্যবহার করো।
          </span>
        )
      )}
    </div>
  );
}
export function Auth({
  onDemo,
  admin = false,
  extras,
  ready = true,
  connectionFailed = false,
}: {
  extras?: ReactNode;
  onDemo: () => void;
  admin?: boolean;
  ready?: boolean;
  connectionFailed?: boolean;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(() =>
    new URLSearchParams(location.search).get("recovery") === "1"
      ? "reset"
      : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [message, setMessage] = useState(() => {
    const callback = new URLSearchParams(location.hash.slice(1));
    return callback.has("error") ||
      new URLSearchParams(location.search).has("error")
      ? "লিংকটি ব্যবহার করা যাচ্ছে না। মেয়াদ শেষ হলে বা আগে ব্যবহার করে থাকলে নতুন লিংক নাও।"
      : "";
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [resendReady, setResendReady] = useState(true);
  const [resendNote, setResendNote] = useState("");
  useEffect(() => {
    const wait = resendAt - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => setResendReady(true), wait);
    return () => clearTimeout(timer);
  }, [resendAt]);
  function switchMode(next: typeof mode) {
    setMode(next);
    setErrors({});
    setMessage("");
    setSent(false);
    setPassword("");
    setResendNote("");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || busy) return;
    const next = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? undefined
        : "একটি সঠিক ইমেইল ঠিকানা দাও।",
      password:
        mode !== "reset" && password.length < (mode === "signup" ? 8 : 1)
          ? mode === "signup"
            ? "পাসওয়ার্ডে অন্তত ৮টি অক্ষর দরকার।"
            : "পাসওয়ার্ড লিখে নাও।"
          : undefined,
    };
    setErrors(next);
    if (next.email || next.password) return;
    setBusy(true);
    setMessage("");
    try {
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { emailRedirectTo: location.origin },
            })
          : mode === "reset"
            ? await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${location.origin}/?recovery=1`,
              })
            : await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
              });
      if (result.error)
        setMessage(
          mode === "signin"
            ? "লগইন হয়নি। ইমেইল ও পাসওয়ার্ড মিলিয়ে আবার চেষ্টা করো। ইমেইল নিশ্চিত করা না থাকলে আগে ইনবক্স দেখো।"
            : "অনুরোধটি পাঠানো যায়নি। একটু পরে আবার চেষ্টা করো।",
        );
      else if (mode !== "signin") {
        // Confirmation is provider-enforced. An unexpectedly issued signup
        // session must never silently enter the learner workspace.
        if (
          mode === "signup" &&
          "data" in result &&
          result.data &&
          "session" in result.data &&
          result.data.session
        ) {
          await supabase.auth.signOut({ scope: "local" });
          setMessage(
            "ইমেইল নিশ্চিত করার ব্যবস্থা এখন প্রস্তুত নয়। পরে আবার চেষ্টা করো।",
          );
        } else {
          setSent(true);
          setPassword("");
          setResendReady(false);
          setResendAt(Date.now() + 60000);
        }
      }
    } catch {
      setMessage("সংযোগে সমস্যা হচ্ছে। ইন্টারনেট দেখে আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (!supabase || busy || !resendReady) return;
    setBusy(true);
    setMessage("");
    setResendNote("");
    setResendReady(false);
    setResendAt(Date.now() + 60000);
    try {
      const result = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: location.origin },
      });
      if (result.error)
        setMessage(
          result.error.status === 429
            ? "অল্প সময়ে কয়েকবার অনুরোধ করা হয়েছে। একটু পরে আবার চেষ্টা করো।"
            : "অনুরোধটি পাঠানো যায়নি। পরে আবার চেষ্টা করো।",
        );
      else
        setResendNote(
          "এই ঠিকানায় নিশ্চিত করার অপেক্ষায় থাকা অ্যাকাউন্ট থাকলে নতুন লিংক পাবে।",
        );
    } catch {
      setMessage("সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin },
      });
      if (r.error)
        setMessage("Google দিয়ে লগইন এখন হচ্ছে না। ইমেইল দিয়ে চেষ্টা করো।");
    } catch {
      setMessage("সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করো।");
    } finally {
      setBusy(false);
    }
  }
  const title = sent
    ? "ইনবক্স দেখে নাও"
    : mode === "signup"
      ? "ইংরেজি শেখা শুরু হোক"
      : mode === "reset"
        ? "পাসওয়ার্ড ভুলে গেছ?"
        : admin
          ? "প্রশাসনে স্বাগতম"
          : "আবার স্বাগতম";
  return (
    <AuthLayout admin={admin} extras={extras}>
      <div className="auth-heading">
        <span className="eyebrow">
          {admin ? "নিরাপদ কর্মক্ষেত্র" : "তোমার শেখার জায়গা"}
        </span>
        <h1>{title}</h1>
        <p className="muted">
          {sent
            ? "ইমেইল না পেলে স্প্যাম ফোল্ডারও দেখে নিও।"
            : mode === "signup"
              ? "একটি অ্যাকাউন্ট, নিজের মতো শেখার একটি নতুন পথ।"
              : mode === "reset"
                ? "অ্যাকাউন্টের ইমেইল দাও। পাসওয়ার্ড বদলানোর লিংক পাঠানোর অনুরোধ করব।"
                : admin
                  ? "অনুমোদিত অ্যাকাউন্ট দিয়ে লগইন করুন।"
                  : "শেখা যেখানে থেমেছিল, সেখান থেকেই শুরু করো।"}
        </p>
      </div>
      {demo ? (
        <>
          <Notice>
            স্থানীয় ডেমো — এখানে আসল অ্যাকাউন্ট বা ক্লাউড সংরক্ষণ ব্যবহার হচ্ছে
            না।
          </Notice>
          <button className="primary auth-submit" onClick={onDemo}>
            {admin ? "স্থানীয় প্রশাসন খুলুন" : "ডেমোতে শেখা শুরু করি"}
            <ArrowRight size={18} />
          </button>
        </>
      ) : !configured || connectionFailed ? (
        <div className="stack">
          <Notice>অ্যাকাউন্ট সংযোগ এখনো প্রস্তুত হয়নি। পরে আবার এসো।</Notice>
          {connectionFailed && (
            <button onClick={() => location.reload()}>আবার চেষ্টা করি</button>
          )}
        </div>
      ) : sent ? (
        <div className="stack">
          <div className="mail-state">
            <Mail size={30} />
            <p>
              {mode === "signup"
                ? "অ্যাকাউন্ট নিশ্চিত করার ইমেইল পেলে তার লিংক খুলে নাও। নিশ্চিত করার পরই শেখা শুরু করতে পারবে।"
                : "এই ইমেইলে অ্যাকাউন্ট থাকলে পাসওয়ার্ড বদলানোর লিংক পাবে।"}
            </p>
            <strong className="wrap" lang="en">
              {email.trim()}
            </strong>
          </div>
          {message && <Notice error>{message}</Notice>}
          {resendNote && <Notice>{resendNote}</Notice>}
          {mode === "signup" && (
            <>
              <button
                className="primary"
                disabled={busy || !resendReady}
                onClick={() => void resend()}
              >
                {busy ? "অনুরোধ পাঠাচ্ছি…" : "নিশ্চিত করার লিংক আবার চাই"}
              </button>
              {!resendReady && (
                <p className="small muted">
                  পরের অনুরোধের আগে একটু অপেক্ষা করো।
                </p>
              )}
              <button
                className="text-button"
                onClick={() => switchMode("signup")}
              >
                ইমেইল ঠিকানা বদলাই
              </button>
            </>
          )}
          <button
            className={mode === "signup" ? "text-button" : "primary"}
            onClick={() => switchMode("signin")}
          >
            লগইনে ফিরে যাই
          </button>
        </div>
      ) : (
        <>
          {mode !== "reset" && (
            <>
              <button
                type="button"
                className="google-button"
                disabled={busy || !ready}
                onClick={() => void google()}
              >
                <span className="google-mark" lang="en" aria-hidden="true">
                  G
                </span>
                Google দিয়ে লগইন
              </button>
              <div className="auth-divider">
                <span>অথবা ইমেইল দিয়ে</span>
              </div>
            </>
          )}
          <form noValidate onSubmit={submit} className="auth-form">
            <div className="field">
              <label htmlFor="auth-email">ইমেইল</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <span className="field-error" id="email-error">
                  {errors.email}
                </span>
              )}
            </div>
            {mode !== "reset" && (
              <PasswordField
                value={password}
                onChange={setPassword}
                signup={mode === "signup"}
                error={errors.password}
              />
            )}
            {mode === "signin" && (
              <button
                type="button"
                className="text-button forgot"
                onClick={() => switchMode("reset")}
              >
                পাসওয়ার্ড ভুলে গেছি
              </button>
            )}
            {message && <Notice error>{message}</Notice>}
            {!ready && (
              <p className="small muted" role="status">
                অ্যাকাউন্টের সংযোগ প্রস্তুত হচ্ছে…
              </p>
            )}
            <button className="primary auth-submit" disabled={busy || !ready}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={18} />
                  অপেক্ষা করো…
                </>
              ) : (
                <>
                  {mode === "signup"
                    ? "অ্যাকাউন্ট তৈরি করো"
                    : mode === "reset"
                      ? "লিংক পাঠাও"
                      : "লগইন"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-switch">
            {mode === "reset" ? (
              <button
                className="text-button"
                onClick={() => switchMode("signin")}
              >
                লগইনে ফিরে যাই
              </button>
            ) : admin ? (
              "শুধু অনুমোদিত কর্মীদের জন্য।"
            ) : mode === "signin" ? (
              <>
                নতুন এখানে?{" "}
                <button
                  className="text-button"
                  onClick={() => switchMode("signup")}
                >
                  অ্যাকাউন্ট তৈরি করো
                </button>
              </>
            ) : (
              <>
                আগেই অ্যাকাউন্ট আছে?{" "}
                <button
                  className="text-button"
                  onClick={() => switchMode("signin")}
                >
                  লগইন করো
                </button>
              </>
            )}
          </p>
        </>
      )}
    </AuthLayout>
  );
}
export function PasswordRecovery({
  onDone,
  admin = false,
}: {
  onDone: () => void;
  admin?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function leaveRecovery() {
    if (!supabase || busy) return;
    setBusy(true);
    const result = await supabase.auth
      .signOut({ scope: "local" })
      .catch(() => ({ error: true }));
    setBusy(false);
    if (result.error) setError("লগআউট হয়নি। আবার চেষ্টা করো।");
    else onDone();
  }
  return (
    <AuthLayout admin={admin}>
      <h1>{done ? "নতুন পাসওয়ার্ড সংরক্ষিত" : "নতুন পাসওয়ার্ড দাও"}</h1>
      <p className="muted">
        {done
          ? "এই পাসওয়ার্ড দিয়ে পরেরবার লগইন করতে পারবে।"
          : "আগেরটির চেয়ে আলাদা, অন্তত ৮টি অক্ষরের পাসওয়ার্ড বেছে নাও।"}
      </p>
      {done ? (
        <button
          className="primary auth-submit"
          disabled={busy}
          onClick={() => void leaveRecovery()}
        >
          লগইনে ফিরে যাই
          <ArrowRight size={18} />
        </button>
      ) : (
        <form
          noValidate
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            if (password.length < 8) {
              setError("পাসওয়ার্ডে অন্তত ৮টি অক্ষর দরকার।");
              return;
            }
            setBusy(true);
            setError("");
            try {
              if (!supabase) throw new Error();
              const r = await supabase.auth.updateUser({ password });
              if (r.error) throw r.error;
              setDone(true);
              setPassword("");
            } catch {
              setError(
                "পাসওয়ার্ড বদলায়নি। লিংকের মেয়াদ শেষ হলে নতুন লিংক নাও।",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <PasswordField
            value={password}
            onChange={setPassword}
            signup
            error={error}
          />
          <button className="primary auth-submit" disabled={busy}>
            {busy ? "সংরক্ষণ হচ্ছে…" : "পাসওয়ার্ড সংরক্ষণ করো"}
          </button>
          {error && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void leaveRecovery()}
            >
              লগইনে ফিরে নতুন লিংক চাই
            </button>
          )}
        </form>
      )}
      {done && error && <Notice error>{error}</Notice>}
    </AuthLayout>
  );
}
