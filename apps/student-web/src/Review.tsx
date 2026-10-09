import { useClock } from "../../../packages/ui/useClock";
import { useState } from "react";
import type { Progress } from "../../../packages/contracts/api";
import { review } from "../../../packages/learning/engine";
import { Card, Notice } from "../../../packages/ui/components";
export function Review({
  state,
  save,
}: {
  state: Progress;
  save: (p: Progress) => void;
}) {
  const now = useClock();
  const [shown, setShown] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const due = state.words.filter((w) => Date.parse(w.due_at) <= now);
  const word = due[0];
  if (!word)
    return (
      <Notice>
        এখন কোনো শব্দের পুনরালোচনা বাকি নেই। শেখার পাঠ থেকে নতুন শব্দ সংরক্ষণ
        করতে পারো।
      </Notice>
    );
  function mark(correct: boolean) {
    save({
      ...state,
      words: state.words.map((w) =>
        w.sense_id === word.sense_id
          ? { ...w, ...review(w.stage, correct) }
          : w,
      ),
    });
    setShown(null);
    setAnswer("");
  }
  return (
    <Card>
      <h2>মনে করে বলি</h2>
      <p>না দেখে বাংলা অর্থ লিখে দেখো। নিজের উত্তর মিলিয়ে সিদ্ধান্ত নাও।</p>
      <div className="recall">
        <h3 lang="en">{word.en}</h3>
        <label className="field">
          তোমার মনে পড়া অর্থ
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </label>
        <button onClick={() => setShown(word.sense_id)}>অর্থ দেখাও</button>
        {shown === word.sense_id && (
          <>
            <p>{word.bn}</p>
            <div className="row">
              <button onClick={() => mark(false)}>আরেকবার শিখব</button>
              <button disabled={!answer.trim()} onClick={() => mark(true)}>
                অর্থটি মনে করতে পেরেছি
              </button>
            </div>
          </>
        )}
      </div>
      <p className="small muted">
        নিজের বলা অনুযায়ী পুনরালোচনার সময় বদলাবে। এটি যাচাইকৃত দক্ষতার দাবি নয়।
      </p>
    </Card>
  );
}
