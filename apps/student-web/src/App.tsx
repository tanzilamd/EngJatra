import { SavedWords } from "./SavedWords";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClock } from "../../../packages/ui/useClock";
import {
  Home,
  Map,
  ChartNoAxesCombined,
  ArrowRight,
  Check,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import {
  demo,
  supabase,
  loadManifest,
  api,
} from "../../../packages/data/client";
import { SyncEngine, type SyncStatus } from "../../../packages/data/sync";
import {
  initialProgress,
  type Progress,
  type SnapshotData,
} from "../../../packages/contracts/api";
import type { Band, ManifestData } from "../../../packages/contracts/content";
import { bands } from "../../../packages/learning/engine";
import { Card, Notice, bn } from "../../../packages/ui/components";
import { Auth } from "../../../packages/ui/Auth";
import { Lesson } from "./Lesson";
import { Library } from "./Library";
import { Review } from "./Review";
import { Dialog, ReportDialog } from "./Dialogs";
type View = "home" | "learn" | "progress" | "lesson" | "review";
export default function App() {
  const now = useClock();
  const [user, setUser] = useState<string | null>(
    demo && localStorage.getItem("engjatra.demo.started") ? "learner" : null,
  );
  const [snapshot, setSnapshot] = useState<SnapshotData>({
    revision: 0,
    state: initialProgress,
  });
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [view, setView] = useState<View>("home");
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [contentError, setContentError] = useState(false);
  const [band, setBand] = useState<Band>("P0");
  const [collection, setCollection] = useState(false);
  const [dialog, setDialog] = useState<"settings" | "help" | "privacy" | null>(
    null,
  );
  const [report, setReport] = useState<string | null>(null);
  const [reportUnit, setReportUnit] = useState<string | undefined>();
  const [tourStep, setTourStep] = useState(0);
  const [placement, setPlacement] = useState(false);
  const [placementAnswer, setPlacementAnswer] = useState<number | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<
    { id: string; unit_id: string; created_at: string }[]
  >([]);
  const [historyPage, setHistoryPage] = useState(0);

  const sync = useRef<SyncEngine | null>(null);
  const state = snapshot.state;
  useEffect(() => {
    if (!supabase || demo) return;
    supabase.auth
      .getSession()
      .then((r) => setUser(r.data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user.id ?? null);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    loadManifest()
      .then(setManifest)
      .catch(() => setContentError(true));
  }, []);
  useEffect(() => {
    if (!user) return;
    const engine = new SyncEngine(
      `engjatra.progress.${demo ? "demo" : user}`,
      (next, s) => {
        setSnapshot(next);
        setStatus(s);
      },
    );
    sync.current = engine;
    void engine.init();
    const flush = () => void engine.flush();
    window.addEventListener("online", flush);
    const timer = setInterval(flush, 15000);
    return () => {
      sync.current = null;
      window.removeEventListener("online", flush);
      clearInterval(timer);
    };
  }, [user]);
  const save = useCallback((next: Progress) => {
    void sync.current?.update(next);
  }, []);
  const close = useCallback(() => setDialog(null), []);
  const closeReport = useCallback(() => setReport(null), []);
  function showReport(item: string, unit = state.unit_id) {
    setReportUnit(unit);
    setReport(item);
  }
  function openLesson(id = state.unit_id, reset = false) {
    const step = reset || id !== state.unit_id ? 0 : state.step;
    save({
      ...state,
      unit_id: id,
      step,
      release:
        step === 0 ? (manifest?.version ?? state.release) : state.release,
    });
    setView("lesson");
  }
  async function logout() {
    if (demo) {
      localStorage.removeItem("engjatra.demo.started");
    } else await supabase?.auth.signOut();
    setUser(null);
    setSnapshot({ revision: 0, state: initialProgress });
    setView("home");
  }
  function beginDemo() {
    if (import.meta.env.MODE !== "demo") return;
    localStorage.setItem("engjatra.demo.started", "1");
    localStorage.setItem("engjatra.demo.role", "learner");
    localStorage.setItem("engjatra.demo.user", "learner");
    setUser("learner");
  }
  async function exportData() {
    try {
      const data = await api("/account/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "engjatra-progress.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNotice("তথ্য রপ্তানি করা যায়নি। আবার চেষ্টা করো।");
    }
  }
  async function requestDelete() {
    try {
      await api("/reports", {
        unit_id: state.unit_id,
        item_id: "account",
        release: state.release,
        category: "deletion",
        text: "নিজের অ্যাকাউন্ট ও সংরক্ষিত ব্যক্তিগত তথ্য মুছে ফেলার অনুরোধ।",
      });
      setNotice(
        "মুছে ফেলার অনুরোধ জমা হয়েছে। এটি সম্পন্ন না হওয়া পর্যন্ত তথ্য মুছে যায়নি।",
      );
    } catch {
      setNotice("অনুরোধটি জমা হয়নি। আবার চেষ্টা করো।");
    }
  }
  async function getHistory(page: number) {
    try {
      const rows = await api<typeof history>(`/history?page=${page}`);
      setHistory(rows);
      setHistoryPage(page);
    } catch {
      setNotice("ইতিহাস এখন পাওয়া যাচ্ছে না।");
    }
  }
  if (!user) return <Auth onDemo={beginDemo} />;
  if (recovery)
    return (
      <main className="onboard">
        <h1>নতুন পাসওয়ার্ড</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await supabase?.auth.updateUser({ password });
            if (r?.error) setNotice("পাসওয়ার্ড বদলানো যায়নি।");
            else setRecovery(false);
          }}
        >
          <label className="field">
            নতুন পাসওয়ার্ড
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary">পাসওয়ার্ড বদলাই</button>
        </form>
        {notice && <Notice>{notice}</Notice>}
      </main>
    );
  if (status === "loading")
    return (
      <p className="loading" role="status">
        অগ্রগতি আসছে…
      </p>
    );
  if (!state.onboarded)
    return (
      <main className="onboard stack">
        <span className="tag">যাত্রার শুরু</span>
        <h1>কোথা থেকে শুরু করতে চাও?</h1>
        <p>সব পথই খোলা থাকবে। এটি কোনো পরীক্ষার ফল নয়।</p>
        <button
          className="primary"
          onClick={() => save({ ...state, onboarded: true })}
        >
          একদম নতুন — শূন্য থেকে শুরু
        </button>
        <button onClick={() => setPlacement(true)}>কিছুটা ইংরেজি পারি</button>
        {placement && (
          <Card>
            <h2>ছোট্ট অনুশীলন</h2>
            <p lang="en">সম্পূর্ণ বাক্যটি বেছে নাও।</p>
            <div className="choices">
              {["I am learning English.", "I learning English."].map((a, i) => (
                <button lang="en" key={a} onClick={() => setPlacementAnswer(i)}>
                  {a}
                </button>
              ))}
            </div>
            {placementAnswer !== null && (
              <Notice>
                {placementAnswer === 0
                  ? "সঠিক হয়েছে। চাইলে A1 দিয়ে শুরু করতে পারো।"
                  : "I-এর পরে এখানে am লাগবে। শূন্য থেকে শুরু করাও ভালো সিদ্ধান্ত।"}
              </Notice>
            )}
            <button
              onClick={() =>
                save({
                  ...state,
                  onboarded: true,
                  unit_id: placementAnswer === 0 ? "A1-01" : "P0-01",
                })
              }
            >
              এই পথ দিয়ে শুরু করি
            </button>
          </Card>
        )}
        <button
          className="quiet"
          onClick={() => save({ ...state, onboarded: true })}
        >
          এখন বাদ দিয়ে শুরু করি
        </button>
      </main>
    );
  const current = manifest?.levels
    .flatMap((l) => l.units)
    .find((u) => u.id === state.unit_id);
  const due = state.words.filter((w) => Date.parse(w.due_at) <= now).length;
  const syncText =
    status === "saved"
      ? demo
        ? "এই ডেমো সেশনে সংরক্ষিত"
        : "সংরক্ষিত হয়েছে"
      : status === "storage_error"
        ? "এই ডিভাইসে অগ্রগতি রাখা যায়নি। সংযোগ ফিরে এলে আবার সংরক্ষণ করো; এখন পাতা বন্ধ কোরো না।"
        : status === "conflict"
          ? "অন্য ডিভাইসের অগ্রগতি মিলিয়ে সংরক্ষণ হচ্ছে…"
          : status === "pending"
            ? "সংরক্ষণ বাকি — সংযোগ ফিরে এলে পাঠানো হবে"
            : "ক্লাউড অগ্রগতি পাওয়া যায়নি। আবার চেষ্টা করো।";
  return (
    <div className={`app ${state.large_text ? "large-text" : ""}`}>
      <a className="skip" href="#main">
        মূল অংশে যাই
      </a>
      {demo && (
        <div className="demo-banner" role="region" aria-label="স্থানীয় ডেমো">
          স্থানীয় ডেমো · আসল অ্যাকাউন্ট বা ক্লাউড নয়
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <img src="/brand/logo-mark.svg" alt="" />
          <span lang="en">EngJatra</span>
        </div>
        <div className="row">
          <button className="quiet small" onClick={() => setDialog("help")}>
            সাহায্য
          </button>
          <button
            className="quiet"
            aria-label="সেটিংস"
            onClick={() => setDialog("settings")}
          >
            <Settings size={20} />
          </button>
        </div>
      </header>
      <div className="layout">
        <nav className="nav" aria-label="মূল পথ">
          {[
            ["home", "হোম", Home],
            ["learn", "শেখা", Map],
            ["progress", "অগ্রগতি", ChartNoAxesCombined],
          ].map(([id, label, Icon]) => {
            const I = Icon as typeof Home;
            return (
              <button
                key={id as string}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
                onClick={() => {
                  setView(id as View);
                  setCollection(false);
                }}
              >
                <I />
                <span>{label as string}</span>
              </button>
            );
          })}
        </nav>
        <main id="main" className="content stack">
          <div className="row between">
            <span className="small muted" role="status">
              {syncText}
            </span>
            {status !== "saved" && (
              <button
                className="small"
                onClick={() => void sync.current?.flush()}
              >
                আবার সংরক্ষণ করি
              </button>
            )}
          </div>
          {!state.tour && (
            <Card className="tour">
              <span className="tag">{bn(tourStep + 1)}/৩ · ছোট পরিচিতি</span>
              <h2>
                {
                  [
                    "একটি ছোট ধাপই যথেষ্ট",
                    "সব শেখার পথ এক জায়গায়",
                    "তোমার অনুশীলন, তোমার গতিতে",
                  ][tourStep]
                }
              </h2>
              <p>
                {
                  [
                    "হোমের বোতাম দিয়ে যেখানে থেমেছিলে, সেখান থেকে শেখা চালিয়ে যাও।",
                    "শেখা থেকে ছয়টি স্তরের পাঠ ও অতিরিক্ত অনুশীলন খুঁজে পাবে।",
                    "অগ্রগতিতে শেষ করা পাঠ ও পরে অনুশীলনের শব্দ দেখো। সাহায্য থেকে পরিচিতি আবার দেখা যাবে।",
                  ][tourStep]
                }
              </p>
              <div className="row">
                <button
                  className="primary"
                  onClick={() =>
                    tourStep < 2
                      ? setTourStep(tourStep + 1)
                      : save({ ...state, tour: true })
                  }
                >
                  {tourStep < 2 ? "পরের পরিচিতি" : "শুরু করি"}
                </button>
                <button onClick={() => save({ ...state, tour: true })}>
                  এখন বাদ দিই
                </button>
              </div>
            </Card>
          )}
          {contentError && (
            <Notice error>
              শেখার তালিকা পাওয়া যায়নি। সংযোগ ফিরে এলে পাতা আবার খোলো।
            </Notice>
          )}
          {view === "home" && (
            <>
              <section className="hero stack">
                <div>
                  <span className="eyebrow" lang="bn">
                    ইংরেজি শেখার যাত্রা
                  </span>
                  <h1>
                    একটু একটু করে,
                    <br />
                    ইংরেজিতে আরও আত্মবিশ্বাস।
                  </h1>
                  <p>আজ একটি ছোট পাঠ। নিজের গতিতে, বাংলার সাহায্য নিয়ে।</p>
                </div>
                <div className="row">
                  <span className="tag">
                    {state.unit_id.split("-")[0] === "P0"
                      ? "Pre-A1"
                      : state.unit_id.split("-")[0]}
                  </span>
                  <span>{current?.title_bn ?? "তোমার পরের পাঠ"}</span>
                </div>
                <button className="primary" onClick={() => openLesson()}>
                  শেখা চালিয়ে যাও <ArrowRight size={19} />
                </button>
              </section>
              <div className="grid">
                <Card>
                  <BookOpen color="#2563eb" />
                  <h2>আজকের ছোট লক্ষ্য</h2>
                  <p>{current?.goal_bn}</p>
                  <p className="small muted">
                    কয়েক মিনিটের মনোযোগ। AI না থাকলেও পাঠ চালু থাকবে।
                  </p>
                </Card>
                <Card>
                  <h2>মনে করে দেখার সময়</h2>
                  <p>
                    <span className="stat">{bn(due)}</span> শব্দ পুনরালোচনা বাকি
                  </p>
                  <button onClick={() => setView("review")}>
                    শব্দ অনুশীলন করি
                  </button>
                </Card>
              </div>
              <Card>
                <div className="row between">
                  <h2>পথে কতটা এগিয়েছ</h2>
                  <span>{bn(state.completed.length)} / ৯৬ পাঠ</span>
                </div>
                <progress
                  value={state.completed.length}
                  max={96}
                  aria-label="শেষ করা পাঠ"
                />
                <p className="small muted">
                  পাঠ শেষ করা দক্ষতার সনদ নয়। নিয়মিত অনুশীলনই পরের ধাপ।
                </p>
              </Card>
            </>
          )}
          {view === "learn" && (
            <>
              <div>
                <span className="eyebrow" lang="bn">
                  এক ধাপ করে এগিয়ে যাই
                </span>
                <h1>তোমার শেখার পথ</h1>
                <p>
                  সব পাঠ খোলা। বর্তমান পাঠ শেষ করে পরেরটি নেওয়া ভালো; চাইলে আগের
                  পাঠ আবার করতে পারো।
                </p>
              </div>
              <div className="tabs">
                {bands.map((b) => (
                  <button
                    className={band === b ? "active" : ""}
                    key={b}
                    onClick={() => setBand(b)}
                  >
                    {b === "P0" ? "Pre-A1" : b}
                  </button>
                ))}
              </div>
              <Card>
                <h2>{manifest?.levels.find((l) => l.id === band)?.name_bn}</h2>
                <p>{manifest?.levels.find((l) => l.id === band)?.goal}</p>
                <button onClick={() => setCollection(!collection)}>
                  {collection
                    ? "পাঠের তালিকা দেখি"
                    : "ব্যাকরণ ও অনুশীলনের সংগ্রহ"}
                </button>
              </Card>
              {collection ? (
                <Library
                  key={band}
                  band={band}
                  state={state}
                  save={save}
                  onReport={showReport}
                />
              ) : (
                <div className="unit-list">
                  {manifest?.levels
                    .find((l) => l.id === band)
                    ?.units.map((u, i) => (
                      <button
                        className={`unit-link ${state.completed.includes(u.id) ? "completed" : ""}`}
                        key={u.id}
                        onClick={() => {
                          openLesson(u.id);
                        }}
                      >
                        <span className="unit-number">{bn(i + 1)}</span>
                        <div>
                          <h3>{u.title_bn}</h3>
                          <p className="small muted">{u.goal_bn}</p>
                          {u.id === state.unit_id && (
                            <span className="tag">এখন এখানে</span>
                          )}
                        </div>
                        {state.completed.includes(u.id) ? (
                          <Check color="#0f766e" aria-label="শেষ করা হয়েছে" />
                        ) : (
                          <ArrowRight size={20} />
                        )}
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
          {view === "lesson" && (
            <Lesson
              key={`${state.unit_id}:${state.release}`}
              state={state}
              save={save}
              onBack={() => setView("learn")}
              onReport={showReport}
            />
          )}
          {view === "review" && (
            <>
              <button className="quiet" onClick={() => setView("progress")}>
                ← অগ্রগতিতে ফিরি
              </button>
              <Review state={state} save={save} />
            </>
          )}
          {view === "progress" && (
            <>
              <h1>তোমার অগ্রগতি</h1>
              <div className="grid">
                <Card>
                  <p>শেষ করা পাঠ</p>
                  <strong className="stat">{bn(state.completed.length)}</strong>
                  <p className="small muted">৯৬টি পাঠের মধ্যে</p>
                </Card>
                <Card>
                  <p>সংরক্ষিত শব্দ</p>
                  <strong className="stat">{bn(state.words.length)}</strong>
                  <p className="small muted">
                    নিজের মনে করে বলা:{" "}
                    {bn(state.words.filter((w) => w.stage >= 3).length)} শব্দ
                  </p>
                </Card>
              </div>
              <Notice>
                এটি অনুশীলনের অগ্রগতি। CEFR দক্ষতা বা শোনা-বলার সনদ নয়।
              </Notice>
              <button className="primary" onClick={() => setView("review")}>
                মনে করে শব্দ অনুশীলন করি
              </button>
              <SavedWords
                state={state}
                save={save}
                onReview={() => setView("review")}
              />
              <Card>
                <h2>ভুল থেকে শেখা</h2>
                {state.mistakes.length ? (
                  <div className="stack">
                    {state.mistakes
                      .slice(-10)
                      .reverse()
                      .map((m) => (
                        <div key={m.activity_id} className="row between">
                          <span>{m.unit_id} · আবার চেষ্টা করার পাঠ</span>
                          <button
                            onClick={() => {
                              openLesson(m.unit_id, true);
                            }}
                          >
                            নতুন করে অনুশীলন
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p>কোনো ভুলের অনুশীলন এখন বাকি নেই।</p>
                )}
                <p className="small muted">
                  একই উত্তর মুখস্থ না করে পাঠের অন্য উদাহরণ ও ব্যাখ্যা নিয়ে আবার
                  চেষ্টা করো।
                </p>
              </Card>
              <Card>
                <h2>লেখার ইতিহাস</h2>
                <p>
                  ইতিহাস রাখা সেটিংস থেকে বেছে নিতে পারো। প্রতি পাতায় সর্বোচ্চ
                  দশটি কথোপকথন।
                </p>
                <button onClick={() => void getHistory(0)}>ইতিহাস দেখি</button>
                {history.map((h) => (
                  <details key={h.id}>
                    <summary>
                      {h.unit_id} ·{" "}
                      {new Date(h.created_at).toLocaleDateString("bn-BD")}
                    </summary>
                    <HistoryMessages id={h.id} />
                  </details>
                ))}
                <div className="row">
                  <button
                    disabled={historyPage === 0}
                    onClick={() => void getHistory(historyPage - 1)}
                  >
                    আগের পাতা
                  </button>
                  <button
                    disabled={history.length < 10}
                    onClick={() => void getHistory(historyPage + 1)}
                  >
                    পরের পাতা
                  </button>
                </div>
              </Card>
            </>
          )}
          {notice && <Notice>{notice}</Notice>}
        </main>
      </div>
      <footer className="footer">
        <button className="quiet small" onClick={() => setDialog("privacy")}>
          গোপনীয়তা ও ব্যবহারের কথা
        </button>
        <p>EngJatra · সহজ ধাপে শেখার আনন্দময় যাত্রা।</p>
      </footer>
      {report && (
        <ReportDialog
          state={state}
          item={report}
          contextUnit={reportUnit}
          onClose={closeReport}
        />
      )}
      {dialog && (
        <Dialog
          title={
            dialog === "settings"
              ? "তোমার পছন্দ"
              : dialog === "help"
                ? "সাহায্য"
                : "গোপনীয়তা ও ব্যবহারের কথা"
          }
          onClose={close}
        >
          {dialog === "settings" ? (
            <div className="stack">
              {[
                ["hints", "বাংলা ব্যাখ্যা শুরুতে দেখাও"],
                ["large_text", "বড় লেখা"],
                ["keep_history", "AI লেখার ইতিহাস রাখব"],
              ].map(([key, label]) => (
                <label className="row" key={key}>
                  <input
                    style={{ width: 24 }}
                    type="checkbox"
                    checked={
                      state[key as "hints" | "large_text" | "keep_history"]
                    }
                    onChange={(e) =>
                      save({ ...state, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
              <button onClick={() => void exportData()}>
                নিজের তথ্য রপ্তানি করি
              </button>
              <button
                onClick={async () => {
                  try {
                    await api("/history", {}, "DELETE");
                    setNotice(
                      "লেখার ইতিহাস মুছে দেওয়া হয়েছে। শেখার অগ্রগতি থাকবে।",
                    );
                  } catch {
                    setNotice("ইতিহাস মুছে দেওয়া যায়নি।");
                  }
                }}
              >
                লেখার ইতিহাস মুছি
              </button>
              <details>
                <summary>অ্যাকাউন্ট মুছে ফেলার অনুরোধ</summary>
                <p>
                  প্রথমে অনুরোধ জমা হবে। অনুমোদিত সহায়তাকারী পরিচয় যাচাই করে
                  স্থায়ীভাবে মুছে দেবেন। তথ্য রপ্তানি করে নিতে পারো।
                </p>
                <button onClick={() => void requestDelete()}>
                  নিজের তথ্য মুছে ফেলার অনুরোধ করি
                </button>
              </details>
              <button onClick={() => void logout()}>
                <LogOut size={18} /> বের হই
              </button>
            </div>
          ) : dialog === "help" ? (
            <div className="stack">
              <p>
                হোম থেকে শেখা চালিয়ে যাও। শেখাতে সব স্তরের পাঠ পাওয়া যায়। উত্তর
                ভুল হলে ব্যাখ্যা পড়ে আবার চেষ্টা করো। লেখা নিজের মতো হতে পারে।
              </p>
              <button
                onClick={() => {
                  save({ ...state, tour: false });
                  setTourStep(0);
                  setDialog(null);
                }}
              >
                ছোট পরিচিতি আবার দেখি
              </button>
              <button
                onClick={() => {
                  showReport(state.unit_id);
                  setDialog(null);
                }}
              >
                সমস্যা জানাই
              </button>
            </div>
          ) : (
            <div className="privacy">
              <p>
                EngJatra লেখাভিত্তিক ইংরেজি অনুশীলন। পাঠের স্তর শিক্ষার পথ
                বোঝায়; সনদ বা স্বাধীন দক্ষতা যাচাই নয়।
              </p>
              <p>
                তোমার অ্যাকাউন্ট, প্রয়োজনীয় অগ্রগতি, শব্দ এবং জমা দেওয়া
                প্রতিবেদন সংরক্ষিত হয়। তোমার তথ্য অন্য শিক্ষার্থী দেখতে পারে না।
                ইতিহাস রাখা ঐচ্ছিক। চেষ্টার সংক্ষিপ্ত ফল সর্বোচ্চ ৬০ দিন বা
                ১,০০০টি রাখা হয়; শেখার অগ্রগতি থাকে। কোনো ব্যক্তিগত তথ্য AI-এ
                পাঠিও না; AI লেখা বহিরাগত সেবা প্রক্রিয়া করে এবং পরামর্শ ভুল হতে
                পারে।
              </p>
              <p>
                ক্লাউডে সংরক্ষণের আগে অপেক্ষমাণ লেখা এই ডিভাইসে থাকে। নিজের তথ্য
                রপ্তানি, ইতিহাস মোছা বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ সেটিংস থেকে
                করা যায়।
              </p>
              <p>
                শিক্ষার্থীদের প্রকাশ্য প্রোফাইল, সামাজিক চ্যাট, রেকর্ডিং বা ফাইল
                আপলোড নেই। বাইরের অনুশীলনের সাইটের নিজস্ব নীতি আছে।
              </p>
              <p>
                জনসাধারণের জন্য চালু করার আগে এই নীতির আইনগত ও বাস্তব ব্যবহার
                যাচাই প্রয়োজন।
              </p>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
function HistoryMessages({ id }: { id: string }) {
  const [rows, setRows] = useState<{ role: string; content: string }[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api<typeof rows>(`/history/${id}`)
      .then(setRows)
      .catch(() => setFailed(true));
  }, [id]);
  return failed ? (
    <Notice error>এই লেখা পাওয়া যায়নি।</Notice>
  ) : (
    <div>
      {rows.map((r, i) => (
        <p key={i} lang="en">
          {r.content}
        </p>
      ))}
    </div>
  );
}
