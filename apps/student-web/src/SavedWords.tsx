import { useState } from "react";
import { Card, bn } from "../../../packages/ui/components";
import type { Progress } from "../../../packages/contracts/api";
export function SavedWords({
  state,
  save,
  onReview,
}: {
  state: Progress;
  save: (p: Progress) => void;
  onReview: () => void;
}) {
  const [page, setPage] = useState(0);
  return (
    <Card>
      <h2>তোমার সংরক্ষিত শব্দ</h2>
      {state.words.length ? (
        <>
          <div className="stack">
            {state.words.slice(page * 20, page * 20 + 20).map((w) => (
              <div className="row between" key={w.sense_id}>
                <div>
                  <strong lang="en">{w.en}</strong>
                  <p>{w.bn}</p>
                  <span className="small muted">
                    আবার অনুশীলন:{" "}
                    {new Date(w.due_at).toLocaleDateString("bn-BD")} · নিজের বলা
                    ধাপ {bn(w.stage)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    save({
                      ...state,
                      words: state.words.map((x) =>
                        x.sense_id === w.sense_id
                          ? { ...x, due_at: new Date().toISOString() }
                          : x,
                      ),
                    });
                    onReview();
                  }}
                >
                  আবার মনে করি
                </button>
              </div>
            ))}
          </div>
          <div className="row">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              আগের শব্দ
            </button>
            <button
              disabled={(page + 1) * 20 >= state.words.length}
              onClick={() => setPage(page + 1)}
            >
              পরের শব্দ
            </button>
          </div>
        </>
      ) : (
        <p>পাঠ থেকে শব্দ সংরক্ষণ করলে এখানে দেখতে পাবে।</p>
      )}
    </Card>
  );
}
