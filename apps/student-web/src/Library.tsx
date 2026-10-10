import { useEffect, useState } from "react";
import type { Band, LibraryData } from "../../../packages/contracts/content";
import type { Progress } from "../../../packages/contracts/api";
import { loadLibrary } from "../../../packages/data/client";
import { Card, Notice } from "../../../packages/ui/components";
export function Library({
  band,
  state,
  release,
  save,
  onReport,
}: {
  band: Band;
  state: Progress;
  release: string;
  save: (p: Progress) => void;
  onReport: (id: string, unit?: string) => void;
}) {
  const [data, setData] = useState<LibraryData | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("grammar");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    loadLibrary(band, release)
      .then((d) => {
        if (live) {
          setData(d);
          setError(false);
          setPage(0);
        }
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [band, release]);
  if (error)
    return (
      <Notice error>
        এই সংগ্রহ খোলা যায়নি। অন্য স্তর বেছে নিয়ে আবার চেষ্টা করো।
      </Notice>
    );
  if (!data) return <p role="status">সংগ্রহ আসছে…</p>;
  const vocabulary = data.vocabulary.filter((v) =>
    `${v.en} ${v.bn}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="stack">
      <h2>অনুশীলনের সংগ্রহ</h2>
      <div className="tabs">
        {[
          ["grammar", "ব্যাকরণ"],
          ["vocabulary", "শব্দ"],
          ["readings", "দীর্ঘ পাঠ"],
          ["conversation", "কথার গল্প"],
          ["checkpoint", "নিজেকে যাচাই"],
          ["resources", "শোনা ও বলা"],
        ].map(([id, label]) => (
          <button
            aria-pressed={tab === id}
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setPage(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {(tab === "grammar" || tab === "vocabulary") && (
        <label className="field">
          খুঁজে দেখি
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="শব্দ বা বিষয়"
          />
        </label>
      )}
      {((tab === "grammar" &&
        !data.grammar.some((g) =>
          JSON.stringify(g).toLowerCase().includes(search.toLowerCase()),
        )) ||
        (tab === "vocabulary" &&
          !data.vocabulary.some((v) =>
            `${v.en} ${v.bn}`.toLowerCase().includes(search.toLowerCase()),
          ))) && (
        <Notice>কিছু পাওয়া যায়নি। অন্য শব্দ বা বিষয় দিয়ে খুঁজে দেখো।</Notice>
      )}
      {tab === "grammar" &&
        data.grammar
          .filter((g) =>
            JSON.stringify(g).toLowerCase().includes(search.toLowerCase()),
          )
          .map((g) => (
            <Card key={g.id}>
              <h3 lang="en">{g.title_en}</h3>
              <button
                className="quiet small"
                onClick={() => onReport(g.id, g.unit_id ?? `${band}-01`)}
              >
                সমস্যা জানাই
              </button>
              <p>{g.rule_bn}</p>
              <p className="example" lang="en">
                {g.example_en}
              </p>
              <p>{g.example_bn}</p>
              <p className="small muted">{g.caveat_bn}</p>
              {!g.unit_id && (
                <span className="tag">স্তরের অতিরিক্ত ব্যাকরণ</span>
              )}
            </Card>
          ))}
      {tab === "vocabulary" &&
        vocabulary.slice(page * 20, (page + 1) * 20).map((v) => (
          <Card key={v.id}>
            <h3 lang="en">{v.en}</h3>
            <button
              className="quiet small"
              onClick={() => onReport(v.id, v.units[0])}
            >
              সমস্যা জানাই
            </button>
            <p>{v.bn}</p>
            {v.english_example ? (
              <p lang="en">{v.english_example}</p>
            ) : (
              <p className="small muted">
                শব্দটি যে পাঠে আছে, সেখানে প্রসঙ্গ মিলিয়ে অনুশীলন করো। এই
                শব্দার্থের আলাদা উদাহরণ এখন নেই।
              </p>
            )}
            <button
              disabled={state.words.some((w) => w.sense_id === v.id)}
              onClick={() =>
                save({
                  ...state,
                  words: [
                    ...state.words,
                    {
                      sense_id: v.id,
                      en: v.en,
                      bn: v.bn,
                      unit_id: v.units[0],
                      stage: 0,
                      due_at: new Date().toISOString(),
                    },
                  ],
                })
              }
            >
              পরে অনুশীলন করব
            </button>
          </Card>
        ))}
      {tab === "vocabulary" && vocabulary.length > 20 && (
        <div className="row between">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            আগের শব্দগুলো
          </button>
          <span className="small muted">
            পৃষ্ঠা {(page + 1).toLocaleString("bn-BD")} /{" "}
            {Math.ceil(vocabulary.length / 20).toLocaleString("bn-BD")}
          </span>
          <button
            disabled={(page + 1) * 20 >= vocabulary.length}
            onClick={() => setPage(page + 1)}
          >
            পরের শব্দগুলো
          </button>
        </div>
      )}
      {tab === "readings" &&
        (data.readings.length ? (
          data.readings.map((r) => (
            <Card key={r.id}>
              <h3 lang="en">{r.title_en}</h3>
              <button
                className="quiet small"
                onClick={() => onReport(r.id, `${band}-01`)}
              >
                সমস্যা জানাই
              </button>
              <p lang="en" className="reading">
                {r.text_en}
              </p>
              <h3 lang="en">{r.question_en}</h3>
              <p>
                পাঠ্য থেকে উত্তরের প্রমাণ চিহ্নিত করো, তারপর উত্তর বেছে নাও।
              </p>
              <div className="choices">
                {r.options.map((o, i) => (
                  <button
                    lang="en"
                    key={o}
                    onClick={() => setAnswers({ ...answers, [r.id]: i })}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {answers[r.id] !== undefined && (
                <Notice>
                  {answers[r.id] === r.correct_index
                    ? "সঠিক হয়েছে। "
                    : "আবার পাঠ্যটি পড়ে চেষ্টা করো। "}
                  {r.answer_explanation_bn}
                </Notice>
              )}
            </Card>
          ))
        ) : (
          <Notice>
            এই স্তরের ছোট পাঠ প্রতিটি পাঠের ভেতরে আছে। দীর্ঘ অতিরিক্ত পাঠ B2 ও
            C1-এ পাওয়া যাবে।
          </Notice>
        ))}
      {tab === "conversation" &&
        data.conversations.map((c) => (
          <Card key={c.id}>
            <h3>{c.scene_bn}</h3>
            <button
              className="quiet small"
              onClick={() => onReport(c.id, c.unit_id)}
            >
              সমস্যা জানাই
            </button>
            <p>{c.learning_focus_bn}</p>
            {c.turns.map((t, i) => (
              <div className="example" key={i}>
                <span className="tag">
                  {t.role === "npc" ? "গল্পের চরিত্র" : "উত্তরের উদাহরণ"}
                </span>
                <p lang="en">{t.text_en}</p>
              </div>
            ))}
            <p>
              নিজের মতো করে উত্তর বলতে বা লিখতে পারো। এটি রেকর্ড বা মূল্যায়ন
              হচ্ছে না।
            </p>
          </Card>
        ))}
      {tab === "checkpoint" && (
        <>
          <Notice>
            এটি নিজের অনুশীলন যাচাই। কোনো CEFR সনদ বা শোনা-বলার মূল্যায়ন নয়।
          </Notice>
          {data.checkpoint.items.map((q) => (
            <Card key={q.item_id}>
              <h3 lang="en">{q.question}</h3>
              <button
                className="quiet small"
                onClick={() => onReport(q.item_id, `${band}-01`)}
              >
                সমস্যা জানাই
              </button>
              <div className="choices">
                {q.options.map((o, i) => (
                  <button
                    key={o}
                    lang="en"
                    onClick={() => setAnswers({ ...answers, [q.item_id]: i })}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {answers[q.item_id] !== undefined && (
                <Notice>
                  {answers[q.item_id] === q.correct_index
                    ? "সঠিক হয়েছে। "
                    : "আরেকবার চেষ্টা করো। "}
                  {q.feedback_bn}
                </Notice>
              )}
            </Card>
          ))}
        </>
      )}
      {tab === "resources" && (
        <>
          <Notice>
            এই অনুশীলন বাইরের সাইটে। শোনা বা বলা এখানে রেকর্ড বা মূল্যায়ন করা হয়
            না।
          </Notice>
          {data.resources.map((r) => (
            <Card key={r.url}>
              <h3 lang="en">{r.name}</h3>
              <a href={r.url} target="_blank" rel="noreferrer">
                বাইরের অনুশীলন খুলে দেখি ↗
              </a>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
