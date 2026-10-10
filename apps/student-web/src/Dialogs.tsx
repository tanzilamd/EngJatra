import { useState } from "react";
import { api } from "../../../packages/data/client";
import type { Progress } from "../../../packages/contracts/api";
import { Notice } from "../../../packages/ui/components";
import { Dialog } from "../../../packages/ui/Dialog";
export { Dialog } from "../../../packages/ui/Dialog";
export function ReportDialog({
  state,
  item,
  onClose,
  contextUnit,
}: {
  state: Progress;
  item: string;
  contextUnit?: string;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(
    item.endsWith("-ai") ? "ai" : "answer",
  );
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await api("/reports", {
        unit_id: contextUnit ?? state.unit_id,
        item_id: item,
        release: state.release,
        category,
        text,
      });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="সমস্যা জানাই" onClose={onClose}>
      {sent ? (
        <Notice>ধন্যবাদ। তোমার প্রতিবেদনটি জমা হয়েছে।</Notice>
      ) : (
        <form onSubmit={send}>
          <p>ব্যক্তিগত তথ্য লিখো না। পাঠ ও সংস্করণ স্বয়ংক্রিয়ভাবে যুক্ত হবে।</p>
          <label className="field">
            সমস্যার ধরন
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                ["answer", "উত্তর"],
                ["translation", "অনুবাদ"],
                ["grammar", "ব্যাকরণ"],
                ["ai", "AI উত্তর"],
                ["support", "সাহায্য"],
              ].map(([id, l]) => (
                <option key={id} value={id}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            কী সমস্যা পেয়েছ?
            <textarea
              required
              minLength={5}
              maxLength={1500}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            প্রতিবেদন জমা দিই
          </button>
          {error && (
            <Notice error>জমা হয়নি। সংযোগ ফিরে এলে আবার চেষ্টা করো।</Notice>
          )}
        </form>
      )}
    </Dialog>
  );
}
