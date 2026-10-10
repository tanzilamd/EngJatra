import { useState } from "react";
import { api, ApiError } from "../../../packages/data/client";
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/reports", {
        unit_id: contextUnit ?? state.unit_id,
        item_id: item,
        release: state.release,
        category,
        text,
      });
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 429
          ? "এখন প্রতিবেদন পাঠানোর সীমা পূর্ণ। কিছুক্ষণ পরে আবার চেষ্টা করো।"
          : cause instanceof ApiError && cause.status === 401
            ? "লগইনের মেয়াদ শেষ হয়েছে। আবার লগইন করে প্রতিবেদন পাঠাও।"
            : "প্রতিবেদন পাঠানো যায়নি। একটু পরে আবার চেষ্টা করো।",
      );
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
            {busy ? "পাঠানো হচ্ছে…" : "প্রতিবেদন জমা দিই"}
          </button>
          {error && <Notice error>{error}</Notice>}
        </form>
      )}
    </Dialog>
  );
}
