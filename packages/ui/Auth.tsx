import { useState } from "react";
import { demo, supabase, configured } from "../data/client";
import { Notice } from "./components";
export function Auth({
  onDemo,
  admin = false,
}: {
  onDemo: () => void;
  admin?: boolean;
}) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: location.origin },
          })
        : mode === "reset"
          ? await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${location.origin}/?recovery=1`,
            })
          : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(
      result.error
        ? "লগইন করা যায়নি। তথ্য যাচাই করে আবার চেষ্টা করো।"
        : "ইমেইল দেখো অথবা শেখা চালিয়ে যাও।",
    );
  }
  return (
    <main className="onboard stack">
      <div className="brand">
        <img src="/brand/logo-mark.svg" alt="" />
        <span lang="en">EngJatra</span>
      </div>
      <h1>
        {admin ? "প্রশাসনে প্রবেশ" : "সহজ ধাপে, নিজের গতিতে ইংরেজি শিখুন।"}
      </h1>
      <p>
        {admin
          ? "অনুমোদিত কর্মীদের জন্য পৃথক নিরাপদ কর্মক্ষেত্র।"
          : "শূন্য থেকে শুরু। ছোট ছোট পাঠ, বাংলায় ব্যাখ্যা, নিজের মতো অনুশীলন।"}
      </p>
      {demo && (
        <>
          <Notice>
            স্থানীয় ডেমো — এখানে আসল অ্যাকাউন্ট বা ক্লাউড সংরক্ষণ ব্যবহার হচ্ছে
            না।
          </Notice>
          <button className="primary" onClick={onDemo}>
            {admin ? "স্থানীয় প্রশাসন খুলুন" : "ডেমোতে শেখা শুরু করি"}
          </button>
        </>
      )}
      {configured && !demo ? (
        <>
          <form onSubmit={submit}>
            <label className="field">
              ইমেইল
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode !== "reset" && (
              <label className="field">
                পাসওয়ার্ড
                <input
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            <button className="primary" disabled={busy}>
              {mode === "signup"
                ? "অ্যাকাউন্ট তৈরি করি"
                : mode === "reset"
                  ? "ফেরত পাওয়ার ইমেইল পাঠাও"
                  : "লগইন করি"}
            </button>
          </form>
          <div className="row">
            <button onClick={() => setMode("signin")}>লগইন</button>
            {!admin && (
              <button onClick={() => setMode("signup")}>নতুন অ্যাকাউন্ট</button>
            )}
            <button onClick={() => setMode("reset")}>
              পাসওয়ার্ড ভুলে গেছি
            </button>
            <button
              onClick={async () => {
                const r = await supabase?.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: location.origin },
                });
                if (r?.error) setMessage("Google লগইন এখন পাওয়া যাচ্ছে না।");
              }}
            >
              Google দিয়ে প্রবেশ
            </button>
          </div>
        </>
      ) : (
        !demo && (
          <Notice>অ্যাকাউন্ট সংযোগ এখনো প্রস্তুত হয়নি। পরে আবার এসো।</Notice>
        )
      )}
      {message && <Notice>{message}</Notice>}
      <p className="small muted">
        লেখা অনুশীলন ও অগ্রগতি সংরক্ষণে প্রয়োজনীয় তথ্যই নেওয়া হয়। AI অনুশীলন
        চাইলে পাঠানো লেখা সেবা প্রদানকারী প্রক্রিয়া করে। কোনো মাইক্রোফোন বা
        আপলোড নেই।
      </p>
    </main>
  );
}
