import "../tutor.css";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, ArrowDown, WifiOff } from "lucide-react";
import type { UnitData } from "../../../../packages/contracts/content";
import { ChatResult } from "../../../../packages/contracts/tutor";
import { messages } from "../../../../packages/contracts/api";
import { tutor, ApiError } from "../../../../packages/data/client";
import { Notice } from "../../../../packages/ui/components";
import {
  completeTurn,
  conversationContext,
  type LocalChat,
  useChatStore,
} from "./store";
export function ChatPanel({
  user,
  chat,
  unit,
  onReport,
  onLearn,
  embedded = false,
}: {
  user: string;
  chat: LocalChat;
  unit: UnitData;
  onReport: (id: string) => void;
  onLearn?: () => void;
  embedded?: boolean;
}) {
  const { store, state } = useChatStore(user);
  const input = useRef<HTMLTextAreaElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const nearBottom = useRef(true);
  const [showBottom, setShowBottom] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [choice, setChoice] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (input.current) {
      input.current.style.height = "auto";
      input.current.style.height = `${Math.min(input.current.scrollHeight, 160)}px`;
    }
  }, [chat.draft]);
  useEffect(() => {
    if (nearBottom.current && viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [chat.messages.length, chat.busy]);
  useEffect(() => {
    const resize = () => {
      if (document.activeElement === input.current)
        input.current
          ?.closest("form")
          ?.scrollIntoView({ block: "end", behavior: "auto" });
    };
    window.visualViewport?.addEventListener("resize", resize);
    return () => window.visualViewport?.removeEventListener("resize", resize);
  }, []);
  const full = chat.messages.length >= 50;
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const active = store.state.chats.find((c) => c.id === chat.id);
    if (
      !active ||
      active.busy ||
      submitting.current ||
      !active.draft.trim() ||
      !store.state.consent ||
      !navigator.onLine ||
      full
    )
      return;
    const text = active.draft.trim();
    submitting.current = true;
    nearBottom.current = true;
    store.patch(active.id, { busy: true, error: "" });
    try {
      const result = ChatResult.parse(
        await tutor(
          unit.id,
          active.release,
          text,
          conversationContext(active),
          true,
          {
            mode: active.mode,
            request_id: crypto.randomUUID(),
            ...(active.cloudId ? { conversation_id: active.cloudId } : {}),
          },
        ),
      );
      if (!result.reply)
        store.patch(active.id, {
          error:
            messages[result.error ?? "AI_PROVIDER_UNCONFIGURED"] ??
            messages.AI_NETWORK_FAILURE,
        });
      else
        store.patch(active.id, {
          messages: completeTurn(active, text, result.reply),
          draft: "",
          title: active.messages.length ? active.title : text.slice(0, 80),
          cloudId: result.conversation_id ?? active.cloudId,
          historyStatus: result.history_status,
        });
    } catch (cause) {
      store.patch(active.id, {
        error:
          cause instanceof ApiError
            ? (messages[cause.code] ??
              (cause.code === "CHAT_FULL"
                ? "এই আলাপের সীমা পূর্ণ। নতুন আলাপ শুরু করো।"
                : messages.AI_NETWORK_FAILURE))
            : messages.AI_NETWORK_FAILURE,
      });
    } finally {
      store.patch(active.id, { busy: false });
      submitting.current = false;
      input.current?.focus();
    }
  }
  const suggestions =
    chat.mode === "lesson"
      ? [
          [
            "এই পাঠটি বুঝতে সাহায্য করো",
            "Please explain this lesson with one simple English example.",
          ],
          [
            "পাঠের শব্দ দিয়ে কথা বলি",
            "Help me practise the vocabulary from this lesson.",
          ],
          ["শুরুর একটি বাক্য নিই", unit.quest.good_response_en],
        ]
      : [
          [
            "দৈনন্দিন কথোপকথন",
            "Let us practise an everyday English conversation about a fictional visit to a shop.",
          ],
          [
            "আমার বাক্য ঠিক করে দাও",
            "Help me correct this English sentence: I goes to the market.",
          ],
          [
            "নতুন শব্দ শিখি",
            "Teach me one useful English word with a Bengali meaning and an example.",
          ],
          [
            "সহজ একটি প্রশ্ন করো",
            "Ask me one simple English practice question. Avoid personal questions.",
          ],
        ];
  function starter(text: string) {
    store.patch(chat.id, { draft: text });
    input.current?.focus();
  }
  return (
    <div className={`tutor-chat ${embedded ? "tutor-embedded" : ""}`}>
      <details className="tutor-privacy" open={!state.consent}>
        <summary>AI ব্যবহারের কথা · ১৮+ · বাংলাদেশ</summary>
        <p className="small muted">
          AI-এর পরামর্শ ভুল হতে পারে। ব্যক্তিগত তথ্য পাঠিও না। Google-এর বিনা
          মূল্যের সেবায় লেখা ও উত্তর পণ্য উন্নয়ন এবং মানুষের পর্যালোচনায় ব্যবহার
          হতে পারে।
        </p>
        <label className="row small tutor-consent">
          <input
            type="checkbox"
            checked={state.consent}
            disabled={chat.busy}
            onChange={(e) => store.consent(e.target.checked)}
          />
          <span>
            আমার বয়স অন্তত ১৮ বছর। AI-এ পাঠানো লেখা ব্যবহারের বিজ্ঞপ্তি পড়েছি ও
            সম্মত আছি।
          </span>
        </label>
      </details>
      <div
        className="tutor-messages"
        ref={viewport}
        onScroll={() => {
          const v = viewport.current!;
          nearBottom.current =
            v.scrollHeight - v.scrollTop - v.clientHeight < 90;
          setShowBottom(!nearBottom.current);
        }}
        role="log"
        aria-label="লেখার কথোপকথন"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
      >
        {!chat.messages.length ? (
          <div className="tutor-welcome">
            <span className="tutor-avatar">
              <Sparkles size={28} />
            </span>
            <h2>
              {chat.mode === "lesson"
                ? "এই পাঠ নিয়ে কথা বলি"
                : "চলো, ইংরেজিতে কথা বলি!"}
            </h2>
            <p>
              ভুল হলেও সমস্যা নেই। ইংরেজিতে লেখো, টিউটর তোমাকে শেখাতে সাহায্য
              করবে।
            </p>
            <div className="tutor-suggestions">
              {suggestions.map(([label, text]) => (
                <button
                  key={label}
                  disabled={chat.busy}
                  onClick={() => starter(text)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="small muted">
              একটি বিষয় বেছে নিয়ে নিচের বাক্যটি পাঠাও।
            </p>
          </div>
        ) : (
          chat.messages.map((m) => (
            <article className={`tutor-message ${m.role}`} key={m.id}>
              <span className="small muted">
                {m.role === "user" ? "তুমি" : "EngJatra টিউটর"}
              </span>
              <p className="english" lang="en">
                {m.content}
              </p>
              {m.reply && (
                <>
                  <div className={`tutor-feedback ${m.reply.feedback_type}`}>
                    <span className="small">
                      {m.reply.feedback_type === "clear_error"
                        ? "বাক্যটি ঠিক করি"
                        : m.reply.feedback_type === "suggestion"
                          ? "আরও স্বাভাবিকভাবে বলা যায়"
                          : "একটু বুঝে নিই"}
                    </span>
                    {m.reply.suggested_revision_en && (
                      <p lang="en" className="english">
                        {m.reply.suggested_revision_en}
                      </p>
                    )}
                    <p>{m.reply.short_explanation_bn}</p>
                  </div>
                  <p lang="en" className="english tutor-question">
                    {m.reply.next_question_en}
                  </p>
                  <button
                    className="quiet small"
                    onClick={() => onReport(`${unit.id}-ai`)}
                  >
                    উত্তরে সমস্যা জানাই
                  </button>
                </>
              )}
            </article>
          ))
        )}
        {chat.busy && (
          <p className="tutor-generating" role="status">
            <Sparkles size={16} />
            টিউটর উত্তর তৈরি করছে…
          </p>
        )}
      </div>
      {showBottom && (
        <button
          className="quiet small tutor-bottom"
          onClick={() => {
            nearBottom.current = true;
            viewport.current?.scrollTo({
              top: viewport.current.scrollHeight,
              behavior: "auto",
            });
            setShowBottom(false);
          }}
        >
          <ArrowDown size={16} />
          নতুন উত্তরে যাই
        </button>
      )}
      {chat.error && (
        <Notice error>
          {chat.error}
          {onLearn && (
            <button className="small" onClick={onLearn}>
              AI ছাড়া শেখা চালিয়ে যাই
            </button>
          )}
        </Notice>
      )}
      {!online && (
        <Notice>
          <WifiOff size={16} />
          সংযোগ নেই। লেখা থাকবে; সংযোগ ফিরলে পাঠাতে পারবে। AI-এর জন্য ইন্টারনেট
          দরকার।
        </Notice>
      )}
      {full && (
        <Notice>
          এই আলাপে ২৫টি উত্তর হয়েছে। নতুন আলাপ শুরু করে অনুশীলন চালিয়ে যাও।
        </Notice>
      )}
      <form className="tutor-composer" onSubmit={send} aria-busy={chat.busy}>
        <label className="sr-only" htmlFor={`composer-${chat.id}`}>
          তোমার ইংরেজি উত্তর
        </label>
        <textarea
          id={`composer-${chat.id}`}
          ref={input}
          lang="en"
          rows={2}
          placeholder="ইংরেজিতে একটি বাক্য লেখো…"
          maxLength={1500}
          value={chat.draft}
          readOnly={chat.busy}
          onChange={(e) => store.patch(chat.id, { draft: e.target.value })}
          aria-describedby={`help-${chat.id}`}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              window.matchMedia("(pointer:fine)").matches
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className="row between">
          <span className="small muted" id={`help-${chat.id}`}>
            {chat.draft.length}/১৫০০ · ব্যক্তিগত তথ্য লিখো না
          </span>
          <button
            className="primary"
            disabled={
              chat.busy ||
              !chat.draft.trim() ||
              !state.consent ||
              !online ||
              full
            }
          >
            <Send size={17} />
            {chat.busy
              ? "উত্তর আসছে…"
              : chat.error
                ? "আবার পাঠাই"
                : "উত্তর পাঠাই"}
          </button>
        </div>
      </form>
      {chat.historyStatus === "saved" && (
        <p className="small muted" role="status">
          এই উত্তরটি ক্লাউডে সংরক্ষিত হয়েছে।
        </p>
      )}
      {(chat.historyStatus === "unavailable" ||
        chat.historyStatus === "full") && (
        <Notice>
          {chat.historyStatus === "full"
            ? "ক্লাউড ইতিহাসের সীমা পূর্ণ।"
            : "ক্লাউডে এই আলাপ রাখা যায়নি।"}{" "}
          এই ট্যাবে অনুশীলন চালু আছে; উত্তর সংরক্ষিত হয়েছে বলে ধরে নিও না।
        </Notice>
      )}
      {embedded && (
        <details open={!!chat.error}>
          <summary>গল্পের অনুশীলন চালিয়ে যাই</summary>
          <p>এখানে AI ছাড়াই অনুশীলন করতে পারো।</p>
          <p lang="en">{unit.quest.npc_question_en}</p>
          <div className="choices">
            {[
              unit.quest.good_response_en,
              unit.quest.challenging_response_en,
            ].map((c, i) => (
              <button key={c} onClick={() => setChoice(i)} lang="en">
                {c}
              </button>
            ))}
          </div>
          {choice !== null && (
            <Notice>
              {choice === 0 ? unit.quest.success_bn : unit.quest.revision_bn}
            </Notice>
          )}
        </details>
      )}
    </div>
  );
}
