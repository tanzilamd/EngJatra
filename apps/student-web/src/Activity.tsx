import { useState } from "react";
import type { ActivityData } from "../../../packages/contracts/content";
import { score } from "../../../packages/learning/engine";
export function Activity({
  activity: a,
  onDone,
  onMistake,
}: {
  activity: ActivityData;
  onDone: () => void;
  onMistake: () => void;
}) {
  const [answer, setAnswer] = useState<
    number | string | Record<string, string>
  >("");
  const [tokens, setTokens] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null | undefined>();
  const [rubric, setRubric] = useState<number[]>([]);
  const writing = !a.auto_graded;
  const submitted = checked !== undefined;
  const complete = writing
    ? rubric.length === (a.rubric_bn?.length ?? 0) &&
      typeof answer === "string" &&
      answer.trim().length > 0
    : checked === true;
  function check() {
    const result = score(
      a,
      a.type === "word_order"
        ? tokens.map((i) => a.tokens![i]).join(" ")
        : answer,
    );
    setChecked(result);
    if (result === false) onMistake();
    if (result === true) onDone();
  }
  return (
    <div className="stack">
      <h2>{a.prompt_bn}</h2>
      {(a.npc_en ?? a.sentence_en ?? a.sentence) && (
        <p className="example english" lang="en">
          {a.npc_en ?? a.sentence_en ?? a.sentence}
        </p>
      )}
      {a.options && (
        <fieldset className="choices">
          <legend className="small">একটি উত্তর বেছে নাও</legend>
          {a.options.map((option, i) => (
            <button
              type="button"
              className={`choice ${answer === i ? "selected" : ""}`}
              aria-pressed={answer === i}
              key={option}
              onClick={() => {
                setAnswer(i);
                setChecked(undefined);
              }}
            >
              <span
                lang={
                  a.type === "meaning_choice" ||
                  a.type === "reading_meaning_choice"
                    ? "bn"
                    : "en"
                }
              >
                {option}
              </span>
            </button>
          ))}
        </fieldset>
      )}
      {a.type === "word_order" && (
        <>
          <div className="tokens" aria-label="সাজানো বাক্য">
            {tokens.length === 0 ? (
              <span className="muted">শব্দে চাপ দিয়ে বাক্য সাজাও</span>
            ) : (
              tokens.map((i, n) => (
                <button
                  key={n}
                  onClick={() => {
                    setTokens(tokens.filter((_, j) => j !== n));
                    setChecked(undefined);
                  }}
                >
                  {a.tokens![i]}
                </button>
              ))
            )}
          </div>
          <div className="row">
            {a.tokens?.map((word, i) => (
              <button
                key={i}
                disabled={tokens.includes(i)}
                onClick={() => {
                  setTokens([...tokens, i]);
                  setChecked(undefined);
                }}
                lang="en"
              >
                {word}
              </button>
            ))}
          </div>
        </>
      )}
      {a.type === "vocab_match" && (
        <div>
          {a.pairs?.map((p) => (
            <label className="field" key={p.en}>
              <span lang="en">{p.en}</span>
              <select
                value={typeof answer === "object" ? (answer[p.en] ?? "") : ""}
                onChange={(e) => {
                  setAnswer({
                    ...(typeof answer === "object" ? answer : {}),
                    [p.en]: e.target.value,
                  });
                  setChecked(undefined);
                }}
              >
                <option value="">অর্থ বেছে নাও</option>
                {[...a.pairs!].reverse().map((v) => (
                  <option key={v.en}>{v.bn}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {writing && (
        <>
          <label className="field">
            তোমার লেখা
            <textarea
              lang="en"
              maxLength={1500}
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </label>
          <details>
            <summary>উদাহরণ ও নিজের লেখা যাচাই</summary>
            <p lang="en" className="example">
              {a.sample_answer}
            </p>
            <p>
              এটি একটি উদাহরণ। অন্য সঠিক উত্তরও হতে পারে। নিজের লেখায় নিচের
              বিষয়গুলো দেখো।
            </p>
            {a.rubric_bn?.map((r, i) => (
              <label className="row" key={r}>
                <input
                  style={{ width: 24 }}
                  type="checkbox"
                  checked={rubric.includes(i)}
                  onChange={(e) =>
                    setRubric(
                      e.target.checked
                        ? [...rubric, i]
                        : rubric.filter((x) => x !== i),
                    )
                  }
                />
                {r}
              </label>
            ))}
          </details>
          <button
            disabled={!complete}
            onClick={() => {
              setChecked(null);
              onDone();
            }}
          >
            নিজের লেখা যাচাই করেছি
          </button>
        </>
      )}
      {!writing && (
        <button
          className="primary"
          disabled={answer === "" && tokens.length === 0}
          onClick={check}
        >
          উত্তর যাচাই করি
        </button>
      )}
      {submitted && (
        <div
          role="status"
          className={checked === false ? "notice error" : "success"}
        >
          <strong>
            {checked === false
              ? "আরেকবার চেষ্টা করি"
              : checked === null
                ? "নিজের লেখা যাচাই করা হয়েছে"
                : "সঠিক হয়েছে!"}
          </strong>
          <p>{a.feedback_bn}</p>
          {checked === false && (
            <button onClick={() => setChecked(undefined)}>
              আবার চেষ্টা করি
            </button>
          )}
        </div>
      )}
    </div>
  );
}
