import { useCallback, useEffect, useState } from "react";
import { Sparkles, Plus, History, Trash2, BookOpen } from "lucide-react";
import type {
  ManifestData,
  UnitData,
  Band,
} from "../../../../packages/contracts/content";
import {
  ChatHeader,
  ChatThread,
  type ChatHeaderData,
} from "../../../../packages/contracts/tutor";
import { api, loadUnit } from "../../../../packages/data/client";
import { Loading, Notice } from "../../../../packages/ui/components";
import { Dialog } from "../../../../packages/ui/Dialog";
import { bands } from "../../../../packages/learning/engine";
import { newChat, useChatStore, type LocalChat } from "./store";
import { ChatPanel } from "./ChatPanel";
export function TutorWorkspace({
  user,
  manifest,
  currentUnit,
  currentRelease,
  keepHistory,
  onHistoryPreference,
  onReport,
  onLearn,
  requested,
  onSelect,
  onLink,
}: {
  user: string;
  manifest: ManifestData;
  currentUnit: string;
  currentRelease: string;
  keepHistory: boolean;
  onHistoryPreference: (value: boolean) => void;
  onReport: (id: string, unit: string, release: string) => void;
  onLearn: () => void;
  requested: { chat?: string; unit?: string; release?: string };
  onSelect: (id: string) => void;
  onLink: (id: string) => void;
}) {
  const { store, state } = useChatStore(user);
  const [loaded, setLoaded] = useState<{
    key: string;
    unit?: UnitData;
    error?: boolean;
  }>({ key: "" });
  const [history, setHistory] = useState<ChatHeaderData[]>([]);
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [confirm, setConfirm] = useState<"all" | string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingChat, setLoadingChat] = useState(false);
  const chat = state.chats.find((c) => c.id === state.selected);
  const unitKey = chat ? `${chat.unit_id}:${chat.release}` : "";
  const unit = loaded.key === unitKey ? loaded.unit : undefined;
  const contentError = loaded.key === unitKey && loaded.error;
  const chatUnit = chat?.unit_id;
  const chatRelease = chat?.release;
  useEffect(() => {
    store.configure(keepHistory);
  }, [store, keepHistory]);
  useEffect(() => {
    let live = true;
    async function restore() {
      if (requested.chat) {
        const existing = store.state.chats.find(
          (c) => c.id === requested.chat || c.cloudId === requested.chat,
        );
        if (existing) {
          store.select(existing.id);
          return;
        }
        setLoadingChat(true);
        try {
          const data = ChatThread.parse(
            await api(`/chat/history/${requested.chat}`),
          );
          if (live) {
            const added = store.add({
              ...data,
              draft: "",
              busy: false,
              error: "",
              cloudId: data.id,
              historyStatus: "saved",
            });
            if (!added)
              setHistoryError(
                "এই ট্যাবে ২০টি আলাপ আছে। একটি অপ্রয়োজনীয় আলাপ সরিয়ে আবার খোলো।",
              );
          }
        } catch {
          if (live) {
            if (!store.state.selected)
              store.add(
                newChat(
                  `${currentUnit.split("-")[0]}-01`,
                  manifest.version,
                  "conversation",
                ),
              );
            setHistoryError(
              "এই আলাপ পাওয়া যায়নি। নিজের ইতিহাস থেকে একটি আলাপ বেছে নাও, অথবা নতুন করে শুরু করো।",
            );
          }
        } finally {
          if (live) setLoadingChat(false);
        }
      } else if (
        requested.unit &&
        manifest.levels.some((l) =>
          l.units.some((u) => u.id === requested.unit),
        )
      ) {
        const found = store.state.chats.find(
          (c) =>
            c.mode === "lesson" &&
            c.unit_id === requested.unit &&
            c.release === (requested.release ?? currentRelease),
        );
        if (found) store.select(found.id);
        else
          store.add(
            newChat(
              requested.unit,
              requested.release ?? currentRelease,
              "lesson",
            ),
          );
      } else if (!store.state.selected)
        store.add(
          newChat(
            `${currentUnit.split("-")[0]}-01`,
            manifest.version,
            "conversation",
          ),
        );
    }
    void restore();
    return () => {
      live = false;
    };
  }, [
    store,
    requested.chat,
    requested.unit,
    requested.release,
    manifest,
    currentUnit,
    currentRelease,
  ]);
  useEffect(() => {
    if (!chatUnit || !chatRelease) return;
    let live = true;
    loadUnit(chatUnit, chatRelease)
      .then((unit) => {
        if (live) setLoaded({ key: unitKey, unit });
      })
      .catch(() => {
        if (live) setLoaded({ key: unitKey, error: true });
      });
    return () => {
      live = false;
    };
  }, [chatUnit, chatRelease, unitKey]);
  const refreshHistory = useCallback(async (next: number) => {
    try {
      const result = await api<{ available: boolean; threads: unknown[] }>(
        `/chat/history?page=${next}`,
      );
      setHistoryError("");
      setCloud(result.available);
      setHistory(result.threads.map((r) => ChatHeader.parse(r)));
      setPage(next);
    } catch {
      setHistoryError(
        "ক্লাউড ইতিহাস পাওয়া যায়নি। এই ট্যাবের আলাপগুলো ব্যবহার করতে পারো।",
      );
    }
  }, []);
  useEffect(() => {
    let live = true;
    api<{ available: boolean; threads: unknown[] }>("/chat/history?page=0")
      .then((result) => {
        if (live) {
          setCloud(result.available);
          setHistory(result.threads.map((r) => ChatHeader.parse(r)));
          setPage(0);
        }
      })
      .catch(() => {
        if (live)
          setHistoryError(
            "ক্লাউড ইতিহাস পাওয়া যায়নি। এই ট্যাবের আলাপগুলো ব্যবহার করতে পারো।",
          );
      });
    return () => {
      live = false;
    };
  }, [user]);
  function start(
    mode: LocalChat["mode"] = chat?.mode ?? "conversation",
    id = chat?.unit_id ?? currentUnit,
    release = mode === "lesson" ? currentRelease : manifest.version,
  ) {
    const next = newChat(
      mode === "conversation" ? `${id.split("-")[0]}-01` : id,
      release,
      mode,
    );
    if (!store.add(next)) {
      setHistoryError(
        "এই ট্যাবে ২০টি আলাপ আছে। অপ্রয়োজনীয় একটি মুছে তারপর নতুন আলাপ শুরু করো।",
      );
      return;
    }
    onSelect(next.id);
    setDrawer(false);
  }
  async function select(id: string) {
    setDrawer(false);
    onSelect(state.chats.find((c) => c.id === id)?.cloudId ?? id);
  }
  useEffect(() => {
    if (chat?.cloudId && requested.chat !== chat.cloudId) onLink(chat.cloudId);
  }, [chat?.cloudId, requested.chat, onLink]);
  async function remove() {
    if (!confirm) return;
    setDeleting(true);
    setHistoryError("");
    try {
      if (confirm === "all") {
        await api("/history", {}, "DELETE");
        store.clear();
        setHistory([]);
        start("conversation");
      } else {
        const target = state.chats.find((c) => c.id === confirm);
        const remote =
          target?.cloudId ??
          (history.some((h) => h.id === confirm) ? confirm : undefined);
        if (remote) await api(`/chat/history/${remote}`, {}, "DELETE");
        store.remove(confirm);
        setHistory(history.filter((h) => h.id !== remote));
        if (chat?.id === confirm) start("conversation");
      }
      setConfirm(null);
    } catch {
      setHistoryError("আলাপ মোছা হয়নি। সংযোগ ফিরে এলে আবার চেষ্টা করো।");
    } finally {
      setDeleting(false);
    }
  }
  const entries = [
    ...state.chats.map((c) => ({ ...c, local: true })),
    ...history
      .filter((h) => !state.chats.some((c) => c.cloudId === h.id))
      .map((h) => ({ ...h, local: false })),
  ];
  const historyPanel = (
    <div className="tutor-history-inner">
      {!drawer && <h2>তোমার আলাপ</h2>}
      <button
        className="tutor-new"
        disabled={!!chat?.busy}
        onClick={() => start()}
      >
        <Plus size={18} />
        নতুন আলাপ শুরু করি
      </button>
      <div className="tutor-history-list">
        {entries.length ? (
          entries.map((c) => (
            <div className="tutor-history-item" key={c.id}>
              <button
                className={chat?.id === c.id ? "active" : ""}
                onClick={() => void select(c.id)}
                disabled={!!chat?.busy}
                aria-current={chat?.id === c.id ? "true" : undefined}
              >
                <span>{c.title}</span>
                <small>
                  {c.mode === "lesson" ? c.unit_id : "কথোপকথন"} ·{" "}
                  {new Date(c.created_at).toLocaleDateString("bn-BD")}
                </small>
              </button>
              <button
                className="quiet"
                aria-label={`আলাপ মুছি: ${c.title}`}
                disabled={!!chat?.busy}
                onClick={() => setConfirm(c.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        ) : (
          <p className="small muted">নতুন আলাপ শুরু করলে এখানে পাওয়া যাবে।</p>
        )}
      </div>
      <div className="row">
        <button
          className="small"
          disabled={page === 0 || !!chat?.busy}
          onClick={() => void refreshHistory(page - 1)}
        >
          আগের পাতা
        </button>
        <button
          className="small"
          disabled={history.length < 10 || page >= 9 || !!chat?.busy}
          onClick={() => void refreshHistory(page + 1)}
        >
          পরের পাতা
        </button>
      </div>
      <label className="row small tutor-consent">
        <input
          type="checkbox"
          checked={keepHistory}
          disabled={!!chat?.busy}
          onChange={(e) => onHistoryPreference(e.target.checked)}
        />
        <span>AI লেখার ইতিহাস রাখব</span>
      </label>
      <p className="small muted">
        {keepHistory
          ? "পছন্দ চালু: এই ট্যাবে লেখা থাকে। ক্লাউডে রাখা হলে প্রতিটি উত্তরের নিচে জানানো হবে।"
          : "ইতিহাস বন্ধ: আলাপ শুধু চলতি পাতার স্মৃতিতে থাকে। রিফ্রেশ বা বের হলে হারিয়ে যাবে।"}
      </p>
      {cloud === false && (
        <p className="small muted">
          ক্লাউডে পূর্ণ আলাপ রাখার সুবিধা এখনো চালু হয়নি। শেখার অগ্রগতি এতে
          বদলাবে না।
        </p>
      )}
      <button
        className="quiet small"
        disabled={!!chat?.busy || !entries.length}
        onClick={() => setConfirm("all")}
      >
        <Trash2 size={15} />
        সব আলাপ মুছি
      </button>
      <button className="quiet small" onClick={() => void refreshHistory(page)}>
        ক্লাউড ইতিহাস আবার দেখি
      </button>
    </div>
  );
  return (
    <section className="tutor-workspace" aria-label="AI টিউটর">
      <header className="tutor-page-header">
        <div className="row">
          <span className="tutor-avatar">
            <Sparkles size={24} />
          </span>
          <div>
            <h1>AI টিউটর</h1>
            <p className="small muted">ইংরেজি শেখার সঙ্গী</p>
          </div>
        </div>
        <button
          className="tutor-history-toggle"
          onClick={() => setDrawer(true)}
          aria-haspopup="dialog"
        >
          <History size={18} />
          আলাপ
        </button>
      </header>
      {historyError && <Notice error>{historyError}</Notice>}
      {state.storageError && (
        <Notice>
          এই ট্যাবে ইতিহাস রাখা যাচ্ছে না। পাতা বন্ধ করার আগে প্রয়োজনীয় লেখা
          নিজের কাছে রাখো।
        </Notice>
      )}
      <div className="tutor-layout">
        <aside className="tutor-history" aria-label="আলাপের ইতিহাস">
          {historyPanel}
        </aside>
        <div className="tutor-main">
          <div className="tutor-mode-controls">
            <div className="tabs" aria-label="AI অনুশীলনের ধরন">
              <button
                className={chat?.mode === "conversation" ? "active" : ""}
                disabled={!!chat?.busy}
                onClick={() => {
                  if (chat?.mode !== "conversation") start("conversation");
                }}
                aria-pressed={chat?.mode === "conversation"}
              >
                কথোপকথন
              </button>
              <button
                className={chat?.mode === "lesson" ? "active" : ""}
                disabled={!!chat?.busy}
                onClick={() => start("lesson", currentUnit, currentRelease)}
                aria-pressed={chat?.mode === "lesson"}
              >
                <BookOpen size={16} />
                পাঠের অনুশীলন
              </button>
            </div>
            <label className="field small">
              শেখার স্তর
              <select
                disabled={!!chat?.busy}
                value={chat?.unit_id.split("-")[0] ?? "P0"}
                onChange={(e) =>
                  start(
                    chat?.mode ?? "conversation",
                    `${e.target.value}-01`,
                    manifest.version,
                  )
                }
              >
                {bands.map((b) => (
                  <option key={b} value={b}>
                    {b === "P0" ? "Pre-A1" : b}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chat?.mode === "lesson" && (
            <label className="field small tutor-lesson-select">
              যে পাঠ নিয়ে কথা বলতে চাও
              <select
                disabled={chat.busy}
                value={chat.unit_id}
                onChange={(e) =>
                  start("lesson", e.target.value, manifest.version)
                }
              >
                {manifest.levels
                  .find((l) => l.id === (chat.unit_id.split("-")[0] as Band))
                  ?.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.id} · {u.title_bn}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {loadingChat ? (
            <Loading />
          ) : contentError ? (
            <Notice error>
              এই পাঠের তথ্য পাওয়া যায়নি। সংযোগ যাচাই করে নতুন আলাপ শুরু করো।
              <button
                onClick={() => {
                  if (chat?.mode !== "conversation") start("conversation");
                }}
              >
                নতুন আলাপ
              </button>
            </Notice>
          ) : chat && unit ? (
            <>
              <p className="small muted tutor-context">
                {chat.mode === "lesson"
                  ? `${unit.title_bn} · ${unit.goal_bn}`
                  : "নিজের স্তরে কথা বলা, বাক্য ঠিক করা ও নতুন শব্দ শেখা"}
              </p>
              <ChatPanel
                key={chat.id}
                user={user}
                chat={chat}
                unit={unit}
                onReport={(id) => onReport(id, unit.id, chat.release)}
                onLearn={onLearn}
              />
            </>
          ) : (
            <Loading />
          )}
        </div>
      </div>
      {drawer && (
        <Dialog title="তোমার আলাপ" onClose={() => setDrawer(false)}>
          {historyPanel}
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title={
            confirm === "all" ? "সব আলাপ মুছে ফেলবে?" : "এই আলাপ মুছে ফেলবে?"
          }
          onClose={() => {
            if (!deleting) setConfirm(null);
          }}
        >
          <p>
            মুছে ফেলা আলাপ ফেরানো যাবে না। পাঠের অগ্রগতি ও সংরক্ষিত শব্দ থাকবে।
          </p>
          <div className="row">
            <button disabled={deleting} onClick={() => setConfirm(null)}>
              এখন থাক
            </button>
            <button
              className="danger"
              disabled={deleting}
              onClick={() => void remove()}
            >
              {deleting ? "মুছছি…" : "আলাপ মুছে ফেলি"}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
