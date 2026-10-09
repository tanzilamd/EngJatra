import { useState } from "react";
import type { UnitData } from "../../../packages/contracts/content";
import type { TutorData, TutorContext } from "../../../packages/contracts/api";
import { messages } from "../../../packages/contracts/api";
import { tutor } from "../../../packages/data/client";
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
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await tutor(unit.id, release, text, turns);
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
    } catch {
      setError(messages.AI_NETWORK_FAILURE);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <h2>লিখে কথা বলি</h2>
      <p className="small muted">
        AI-এর পরামর্শ ভুল হতে পারে। ব্যক্তিগত তথ্য পাঠিও না। তোমার লেখা সেবা
        প্রদানকারী প্রক্রিয়া করে।
      </p>
      <p lang="en" className="example">
        {reply?.next_question_en ?? unit.quest.npc_question_en}
      </p>
      {reply && (
        <div className="card">
          <p lang="en">{reply.assistant_reply_en}</p>
          <p>{reply.short_explanation_bn}</p>
          {reply.suggested_revision_en && (
            <p lang="en">{reply.suggested_revision_en}</p>
          )}
          <button onClick={() => onReport(`${unit.id}-ai`)}>
            উত্তরে সমস্যা জানাই
          </button>
        </div>
      )}
      <form onSubmit={send}>
        <label className="field">
          তোমার ইংরেজি উত্তর
          <textarea
            lang="en"
            maxLength={1500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </label>
        <button className="primary" disabled={busy || !text.trim()}>
          {busy ? "উত্তর আসছে…" : "উত্তর পাঠাই"}
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
