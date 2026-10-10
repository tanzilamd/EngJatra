import { useEffect, useState } from "react";
import type { Progress } from "../../../packages/contracts/api";
import type { UnitData } from "../../../packages/contracts/content";
import { loadUnit } from "../../../packages/data/client";
import { bn, Card, Notice } from "../../../packages/ui/components";
import { nextUnit } from "../../../packages/learning/engine";
import { Activity } from "./Activity";
import { Tutor } from "./Tutor";
export function Lesson({
  state,
  save,
  onBack,
  onReport,
}: {
  state: Progress;
  save: (s: Progress) => void;
  onBack: () => void;
  onReport: (id: string) => void;
}) {
  const [unit, setUnit] = useState<UnitData | null>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState<number | null>(null);
  const [quest, setQuest] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(state.hints);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    loadUnit(state.unit_id, state.release)
      .then((u) => {
        if (live) {
          setUnit(u);
          setError(false);
        }
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [state.unit_id, state.release, retry]);

  if (error)
    return (
      <Card>
        <h2>এই পাঠ এখন খোলা যাচ্ছে না</h2>
        <p>সংযোগ যাচাই করে আবার চেষ্টা করো। আগের অগ্রগতি নিরাপদ আছে।</p>
        <div className="row">
          <button onClick={() => setRetry(retry + 1)}>আবার চেষ্টা করি</button>
          <button onClick={onBack}>পথে ফিরি</button>
        </div>
      </Card>
    );
  if (!unit)
    return (
      <p role="status" className="loading">
        পাঠ আসছে…
      </p>
    );
  const steps = unit.exercises.length + 6;
  const step = Math.min(state.step, steps - 1);
  const activity =
    step >= 3 && step < 3 + unit.exercises.length
      ? unit.exercises[step - 3]
      : undefined;
  function mistake() {
    if (!activity || !unit) return;
    save({
      ...state,
      attempts: [
        ...state.attempts,
        {
          id: crypto.randomUUID(),
          unit_id: unit.id,
          activity_id: activity.id,
          release: state.release,
          outcome: false,
        },
      ].slice(-300),
      mistakes: [
        ...state.mistakes.filter((m) => m.activity_id !== activity.id),
        { unit_id: unit.id, activity_id: activity.id, skill: activity.type },
      ].slice(-300),
    });
  }
  function next() {
    save({ ...state, step: step + 1 });
  }
  function word(en: string, bnText: string, sense?: string) {
    const id = sense ?? `${unit!.id}:${en}`;
    if (state.words.some((w) => w.sense_id === id)) return;
    save({
      ...state,
      words: [
        ...state.words,
        {
          sense_id: id,
          en,
          bn: bnText,
          unit_id: unit!.id,
          stage: 0,
          due_at: new Date().toISOString(),
        },
      ],
    });
  }
  return (
    <div className="lesson stack">
      <div className="row between">
        <button className="quiet" onClick={onBack}>
          ← শেখার পথে
        </button>
        <span className="tag">
          {unit.level === "P0" ? "Pre-A1" : unit.level} · {bn(step + 1)}/
          {bn(steps)}
        </span>
      </div>
      <progress value={step + 1} max={steps} aria-label="পাঠের অগ্রগতি" />
      <Card>
        <div className="row between">
          <h1>{unit.title_bn}</h1>
          <button
            className="quiet small"
            onClick={() => onReport(activity?.id ?? unit.id)}
          >
            সমস্যা জানাই
          </button>
        </div>
        {step === 0 && (
          <>
            <span className="tag">আজকের ছোট লক্ষ্য</span>
            <h2>{unit.goal_bn}</h2>
            <p>{unit.rule_bn}</p>
            <p className="example english" lang="en">
              {unit.example_en}
            </p>
            <button
              onClick={() => setShowHint(!showHint)}
              aria-expanded={showHint}
            >
              বাংলায় বুঝিয়ে দাও
            </button>
            {showHint && <p>{unit.translation_bn}</p>}
          </>
        )}
        {step === 1 && (
          <>
            <h2>শব্দের সঙ্গে বন্ধুত্ব</h2>
            <p>
              শব্দ সংরক্ষণ করা আর অর্থ মনে রাখতে পারা আলাদা। পরে অর্থ মনে করে
              অনুশীলন করো।
            </p>
            <div className="grid">
              {unit.vocabulary.map((v) => (
                <div className="card" key={v.en}>
                  <h3 lang="en">{v.en}</h3>
                  <p>{v.bn}</p>
                  <button
                    onClick={() => word(v.en, v.bn, v.id)}
                    disabled={state.words.some(
                      (w) => w.sense_id === (v.id ?? `${unit.id}:${v.en}`),
                    )}
                  >
                    {state.words.some(
                      (w) => w.sense_id === (v.id ?? `${unit.id}:${v.en}`),
                    )
                      ? "সংরক্ষিত"
                      : "পরে অনুশীলন করব"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>পড়ে বুঝি</h2>
            <p>{unit.reading.focus_bn}</p>
            <p lang="en" className="reading example">
              {unit.reading.text_en}
            </p>
            <p>
              পাঠ্যের কোন শব্দ বা বাক্যে মূল তথ্য আছে? নিজের মনে চিহ্নিত করো।
              পরের অনুশীলনে অর্থ মিলিয়ে দেখো।
            </p>
          </>
        )}
        {activity && (
          <Activity
            key={activity.id}
            activity={activity}
            onDone={() => {
              setReady(step);
              save({
                ...state,
                attempts: [
                  ...state.attempts,
                  {
                    id: crypto.randomUUID(),
                    unit_id: unit.id,
                    activity_id: activity.id,
                    release: state.release,
                    outcome: activity.auto_graded ? true : null,
                  },
                ].slice(-300),
              });
            }}
            onMistake={mistake}
          />
        )}
        {step === 3 + unit.exercises.length && (
          <>
            <h2>গল্পের নতুন মোড়</h2>
            <p>{unit.quest.opening_bn}</p>
            <p lang="en" className="example">
              {unit.quest.npc_question_en}
            </p>
            <div className="choices">
              {[
                unit.quest.good_response_en,
                unit.quest.challenging_response_en,
              ].map((c, i) => (
                <button
                  key={c}
                  lang="en"
                  onClick={() => setQuest(i === 0 ? step : null)}
                >
                  {c}
                </button>
              ))}
            </div>
            {quest === step && <Notice>{unit.quest.success_bn}</Notice>}
            {quest === step && unit.quest.follow_up_question_en && (
              <>
                <p lang="en">{unit.quest.follow_up_question_en}</p>
                <details>
                  <summary>উত্তরের উদাহরণ</summary>
                  <p lang="en">{unit.quest.guided_reply_en}</p>
                  <p>এটি একটি উদাহরণ; নিজের উত্তরও হতে পারে।</p>
                </details>
              </>
            )}
          </>
        )}
        {step === 4 + unit.exercises.length && (
          <Tutor unit={unit} release={state.release} onReport={onReport} />
        )}
        {step === 5 + unit.exercises.length && (
          <>
            <div className="success">
              <h2>আজ এক ধাপ এগিয়েছ!</h2>
              <p>{unit.goal_bn}</p>
            </div>
            <p>
              পাঠ শেষ করা আর দক্ষতা অর্জন এক নয়। শব্দগুলো পরে মনে করে অনুশীলন
              করো। এটি কোনো সনদ নয়।
            </p>
            <button
              className="primary"
              onClick={() => {
                save({
                  ...state,
                  completed: [...new Set([...state.completed, unit.id])],
                  unit_id: nextUnit(unit.id),
                  step: 0,
                });
                onBack();
              }}
            >
              পাঠ শেষ করে পথে ফিরি
            </button>
          </>
        )}
      </Card>
      {step < steps - 1 && (
        <button
          className="primary"
          disabled={
            activity
              ? ready !== step
              : step === 3 + unit.exercises.length
                ? quest !== step
                : false
          }
          onClick={next}
        >
          {step === 4 + unit.exercises.length
            ? "এখন পাঠ শেষ করি"
            : "পরের ধাপে যাই"}
        </button>
      )}
    </div>
  );
}
