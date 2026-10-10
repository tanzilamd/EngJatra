import { useRef, useState } from "react";
import type { UnitData } from "../../../packages/contracts/content";
import type { TutorData, TutorContext } from "../../../packages/contracts/api";
import { messages } from "../../../packages/contracts/api";
import { tutor, ApiError } from "../../../packages/data/client";
import { Notice } from "../../../packages/ui/components";
export function Tutor({
  unit,
  release,
  onReport,
}: {
  unit: UnitData;
  release: string;
  onReport: (id: string) => void;
}) {
  const [turns, setTurns] = useState<TutorContext>([]);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<TutorData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !text.trim() || !consent) return;
    setBusy(true);
    setError("");
    try {
      const r = await tutor(unit.id, release, text, turns, consent);
      if (r.reply) {
        setTurns(
          [
            ...turns,
            { role: "user", text: text.slice(0, 1000) },
            {
              role: "assistant",
              text: `${r.reply.assistant_reply_en} ${r.reply.next_question_en}`.slice(
                0,
                1000,
              ),
            },
          ].slice(-6) as TutorContext,
        );
        setReply(r.reply);
        setText("");
      } else
        setError(
          messages[r.error ?? "AI_PROVIDER_UNCONFIGURED"] ??
            messages.AI_PROVIDER_UNCONFIGURED,
        );
    } catch (e) {
      setError(
        e instanceof ApiError
          ? (messages[e.code] ?? messages.AI_NETWORK_FAILURE)
          : messages.AI_NETWORK_FAILURE,
      );
    } finally {
      setBusy(false);
      input.current?.focus();
    }
  }
  return (
    <div className="stack">
      <h2>লিখে কথা বলি</h2>
      <p className="small muted">
        AI-এর পরামর্শ ভুল হতে পারে। ব্যক্তিগত তথ্য পাঠিও না। বিনা মূল্যের Google
        সেবায় পাঠানো লেখা পণ্য উন্নয়ন ও মানুষের পর্যালোচনায় ব্যবহার হতে পারে। এই
        AI সেবার জন্য বয়স অন্তত ১৮ বছর এবং সেবাদাতার অন্য শর্ত পূরণ হওয়া দরকার।
        AI ছাড়াও নিচের গল্পের অনুশীলন করা যায়।
      </p>
      <label className="row small tutor-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={busy}
        />
        <span>
          আমার বয়স অন্তত ১৮ বছর। AI-এ পাঠানো লেখা ব্যবহারের বিজ্ঞপ্তি পড়েছি ও
          সম্মত আছি।
        </span>
      </label>
      <div
        className="chat-thread"
        role="log"
        aria-label="লেখার কথোপকথন"
        aria-live="polite"
      >
        {!turns.length && (
          <div className="chat-bubble">
            <p className="small">অনুশীলনের সঙ্গী</p>
            <p lang="en">{unit.quest.npc_question_en}</p>
          </div>
        )}
        {turns.map((turn, i) => (
          <div
            className={`chat-bubble ${turn.role === "user" ? "user" : ""}`}
            key={i}
          >
            <p className="small">
              {turn.role === "user" ? "তোমার উত্তর" : "অনুশীলনের সঙ্গী"}
            </p>
            <p lang="en">{turn.text}</p>
          </div>
        ))}
      </div>
      {reply && (
        <div className="card">
          <h3>উত্তরটি নিয়ে একটু ভাবি</h3>
          <p>{reply.short_explanation_bn}</p>
          {reply.suggested_revision_en && (
            <p lang="en">{reply.suggested_revision_en}</p>
          )}
          <button onClick={() => onReport(`${unit.id}-ai`)}>
            উত্তরে সমস্যা জানাই
          </button>
        </div>
      )}
      <form onSubmit={send} aria-busy={busy}>
        <label className="field">
          তোমার ইংরেজি উত্তর
          <textarea
            ref={input}
            lang="en"
            maxLength={1500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            readOnly={busy}
            aria-describedby="tutor-input-help"
          />
        </label>
        <p className="small muted" id="tutor-input-help">
          ব্যক্তিগত তথ্য ছাড়া ইংরেজি অনুশীলনের বাক্য লেখো। {text.length}/১৫০০
        </p>
        {!turns.length && !text && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setText(unit.quest.good_response_en);
              input.current?.focus();
            }}
          >
            শুরুর একটি বাক্য নিই
          </button>
        )}
        <button className="primary" disabled={busy || !text.trim() || !consent}>
          {busy ? "উত্তর আসছে…" : error ? "আবার পাঠাই" : "উত্তর পাঠাই"}
        </button>
      </form>
      {error && <Notice>{error}</Notice>}
      <details open={!!error}>
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
    </div>
  );
}
