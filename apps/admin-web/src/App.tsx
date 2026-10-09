import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessagesSquare,
  FilePenLine,
  PackageCheck,
  Shield,
  Activity as ActivityIcon,
  LogOut,
} from "lucide-react";
import { api, demo, supabase, ApiError } from "../../../packages/data/client";
import { Unit, type UnitData } from "../../../packages/contracts/content";
import { bands } from "../../../packages/learning/engine";
import { Auth } from "../../../packages/ui/Auth";
import { Card, Notice, bn } from "../../../packages/ui/components";
import { Activity } from "../../student-web/src/Activity";
import { Dialog } from "../../student-web/src/Dialogs";
interface Draft {
  unit_id: string;
  release: string;
  patch: UnitData;
  revision: number;
  review_status?: string;
  admin_notes: string;
}
interface Overview {
  reports: {
    id: string;
    unit_id: string;
    item_id: string;
    release: string;
    category: string;
    text: string;
    state: string;
    created_at: string;
  }[];
  releases: { id: string; manifest_sha256: string; state: string }[];
  audit: {
    actor: string;
    action: string;
    object_id: string;
    created_at: string;
  }[];
  usage: { scope: string; count: number }[];
  health: { provider: string; category: string; observed_at: string }[];
  blocks: string[];
}
const nav = [
  ["overview", "সারসংক্ষেপ", LayoutDashboard],
  ["reports", "প্রতিবেদন", MessagesSquare],
  ["content", "সম্পাদনা", FilePenLine],
  ["releases", "প্রকাশ", PackageCheck],
  ["ops", "পরিচালনা", ActivityIcon],
  ["support", "সহায়তা", Shield],
] as const;
export default function App() {
  const [authenticated, setAuthenticated] = useState(
    demo && sessionStorage.getItem("engjatra.admin.started") === "yes",
  );
  const [role, setRole] = useState("");
  const [tab, setTab] = useState("overview");
  const [info, setInfo] = useState<Overview | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unitId, setUnitId] = useState("P0-01");
  const [unit, setUnit] = useState<UnitData | null>(null);
  const [json, setJson] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState(false);
  const [revision, setRevision] = useState(0);
  const [reviewStatus, setReviewStatus] = useState("draft");
  const [query, setQuery] = useState("");
  const [release, setRelease] = useState("3.0.0");
  const [releaseId, setReleaseId] = useState("");
  const [digest, setDigest] = useState("");
  const [blockId, setBlockId] = useState("");
  const [support, setSupport] = useState<
    { user_id: string; alias: string | null }[]
  >([]);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    action: () => Promise<unknown>;
  }>(null);
  const canEdit = ["content_editor", "admin", "owner"].includes(role);
  const canManage = ["admin", "owner"].includes(role);
  const refresh = useCallback(async () => {
    try {
      const s = await api<{ role: string }>("/admin/session");
      setRole(s.role);
      const [data, changes] = await Promise.all([
        api<Overview>("/admin/overview"),
        api<Draft[]>("/admin/drafts"),
      ]);
      setInfo(data);
      setDrafts(changes);
      setError("");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403
          ? "এই অ্যাকাউন্টে প্রশাসনের অনুমতি নেই।"
          : "প্রশাসনের সংযোগ পাওয়া যায়নি।",
      );
      setRole("");
    }
  }, []);
  useEffect(() => {
    if (demo) return;
    supabase?.auth.getSession().then((r) => setAuthenticated(!!r.data.session));
    const sub = supabase?.auth.onAuthStateChange((_, s) =>
      setAuthenticated(!!s),
    );
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (authenticated) void Promise.resolve().then(refresh);
  }, [authenticated, refresh]);
  async function load() {
    try {
      const published = await api<{ unit: UnitData; release: string }>(
        `/admin/content?id=${unitId}`,
      );
      const draft = (await api<Draft[]>("/admin/drafts")).find(
        (d) => d.unit_id === unitId,
      );
      const selected = draft?.patch ?? published.unit;
      setUnit(selected);
      setJson(JSON.stringify(selected, null, 2));
      setNotes(draft?.admin_notes ?? "");
      setRevision(draft?.revision ?? 0);
      setReviewStatus(draft?.review_status ?? "draft");
      setRelease(draft?.release ?? published.release);
      setNotice("পাঠটি খোলা হয়েছে।");
    } catch {
      setNotice("পাঠ পাওয়া যায়নি। সংযোগ যাচাই করুন।");
    }
  }
  async function mutate(path: string, body: unknown) {
    try {
      await api(`/admin/${path}`, body);
      setNotice("পরিবর্তন সংরক্ষিত হয়েছে। প্রকাশিত সাইট বদলায়নি।");
      await refresh();
      return true;
    } catch (e) {
      setNotice(
        e instanceof ApiError && e.status === 409
          ? "অন্য সম্পাদনা পাওয়া গেছে। পাঠটি আবার খুলে পরিবর্তন মিলিয়ে নিন।"
          : "পরিবর্তন সংরক্ষিত হয়নি। অনুমতি ও তথ্য যাচাই করুন।",
      );
      return false;
    }
  }
  async function saveDraft() {
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      setNotice("JSON সঠিক নয়।");
      return;
    }
    const parsed = Unit.safeParse(raw);
    if (!parsed.success) {
      setNotice("পাঠের গঠন সঠিক নয়।");
      return;
    }
    const saved = await mutate("draft", {
      unit_id: unitId,
      release,
      patch: parsed.data,
      admin_notes: notes,
      expected_revision: revision,
    });
    if (saved) {
      setRevision(revision + 1);
      setUnit(parsed.data);
    }
  }
  async function download() {
    try {
      const data = await api("/admin/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "engjatra-release.local.json";
      a.click();
      URL.revokeObjectURL(url);
      setNotice(
        "পাবলিক-নিরাপদ সংশোধন রপ্তানি হয়েছে। এখন নিরীক্ষা, সংস্করণ তৈরি ও অনুমোদিত ডেপ্লয় প্রয়োজন।",
      );
    } catch {
      setNotice("রপ্তানি করা যায়নি।");
    }
  }
  const closeConfirm = useCallback(() => setConfirm(null), []);
  if (!authenticated)
    return (
      <Auth
        admin
        onDemo={() => {
          if (import.meta.env.MODE !== "demo") return;
          sessionStorage.setItem("engjatra.admin.started", "yes");
          localStorage.setItem("engjatra.demo.user", "staff");
          localStorage.setItem("engjatra.demo.role", "admin");
          setAuthenticated(true);
        }}
      />
    );
  if (!role)
    return (
      <main className="onboard stack">
        <h1>প্রশাসন</h1>
        <Notice error>{error || "অনুমতি যাচাই হচ্ছে…"}</Notice>
        <button onClick={() => void refresh()}>আবার যাচাই করি</button>
        <button
          onClick={async () => {
            await supabase?.auth.signOut();
            sessionStorage.removeItem("engjatra.admin.started");
            setAuthenticated(false);
          }}
        >
          বের হই
        </button>
      </main>
    );
  return (
    <div className="admin-shell">
      <a className="skip" href="#admin-main">
        মূল অংশে যাই
      </a>
      {demo && (
        <div
          className="demo-banner"
          role="region"
          aria-label="স্থানীয় প্রশাসন ডেমো"
        >
          স্থানীয় প্রশাসন ডেমো · আসল ভূমিকা বা প্রকাশ নয়
        </div>
      )}
      <header className="topbar">
        <div className="brand">
          <img src="/brand/logo-mark.svg" alt="" />
          <span lang="en">EngJatra</span>
          <span className="tag">প্রশাসন</span>
        </div>
        <div className="row">
          <span className="tag" lang="en">
            {role}
          </span>
          <button
            aria-label="বের হই"
            onClick={async () => {
              sessionStorage.removeItem("engjatra.admin.started");
              await supabase?.auth.signOut();
              setAuthenticated(false);
              setRole("");
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <div className="layout">
        <nav className="nav" aria-label="প্রশাসনের পথ">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                if (id === "support")
                  api<typeof support>("/admin/support")
                    .then(setSupport)
                    .catch(() => setNotice("সহায়তা তথ্য দেখার অনুমতি নেই।"));
              }}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </nav>
        <main className="content stack" id="admin-main">
          <div className="row between">
            <h1>{nav.find((n) => n[0] === tab)?.[1]}</h1>
            <button onClick={() => void refresh()}>তথ্য হালনাগাদ</button>
          </div>
          {notice && <Notice>{notice}</Notice>}
          {error && <Notice error>{error}</Notice>}
          {tab === "overview" && (
            <>
              <div className="grid">
                <Card>
                  <p>শেখার পাঠ</p>
                  <strong className="stat">৯৬</strong>
                  <p>ছয়টি স্তর</p>
                </Card>
                <Card>
                  <p>খোলা প্রতিবেদন</p>
                  <strong className="stat">
                    {bn(
                      info?.reports.filter((r) => r.state !== "resolved")
                        .length ?? 0,
                    )}
                  </strong>
                </Card>
                <Card>
                  <p>সংরক্ষিত সংশোধন</p>
                  <strong className="stat">{bn(drafts.length)}</strong>
                  <p>এখনো প্রকাশ নয়</p>
                </Card>
              </div>
              <Notice>
                শিক্ষার্থী ডেলিভারিতে সম্পাদকীয় অবস্থা বা ব্যক্তিগত নোট যাবে না।
                এখানে গবেষণা ও সংশোধনের তথ্য কেবল অনুমোদিত কর্মীদের জন্য।
              </Notice>
              <Card>
                <h2>সাম্প্রতিক নিরীক্ষা</h2>
                <Audit rows={info?.audit ?? []} />
              </Card>
            </>
          )}
          {tab === "reports" && (
            <Card>
              <h2>প্রতিবেদনের তালিকা</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>পাঠ / সংস্করণ</th>
                      <th>সমস্যা</th>
                      <th>বর্ণনা</th>
                      <th>অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info?.reports.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.unit_id}
                          <br />
                          {r.item_id}
                          <br />
                          {r.release}
                        </td>
                        <td>{r.category}</td>
                        <td>{r.text}</td>
                        <td>
                          <label className="field">
                            <span className="small">প্রতিবেদনের অবস্থা</span>
                            <select
                              value={r.state}
                              onChange={(e) =>
                                void mutate("report", {
                                  id: r.id,
                                  state: e.target.value,
                                })
                              }
                            >
                              {[
                                ["open", "খোলা"],
                                ["investigating", "যাচাই হচ্ছে"],
                                ["resolved", "সমাধান"],
                              ].map(([v, l]) => (
                                <option value={v} key={v}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!info?.reports.length && <p>কোনো প্রতিবেদন নেই।</p>}
              <p>
                মুছে ফেলার অনুরোধে পরিচয় যাচাই করুন। এই পর্দা অন্যের অ্যাকাউন্ট
                মুছে দিতে বা ভূমিকা বাড়াতে পারে না।
              </p>
            </Card>
          )}
          {tab === "content" && (
            <>
              <Card>
                <h2>পাঠ খুঁজে খুলুন</h2>
                <label className="field">
                  ID বা স্তর দিয়ে খুঁজুন
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label className="field">
                  পাঠের স্থায়ী ID
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                  >
                    {bands
                      .flatMap((b) =>
                        Array.from(
                          { length: 16 },
                          (_, i) => `${b}-${String(i + 1).padStart(2, "0")}`,
                        ),
                      )
                      .filter((id) =>
                        id.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((id) => (
                        <option key={id}>{id}</option>
                      ))}
                  </select>
                </label>
                <button onClick={() => void load()}>পাঠ খুলুন</button>
              </Card>
              {unit && (
                <Card>
                  <h2>{unit.title_bn}</h2>
                  <span className="tag">
                    ব্যক্তিগত সংশোধন · সংস্করণ {release} · খসড়া {revision}
                  </span>
                  <label className="field">
                    পাঠের পাবলিক JSON
                    <textarea
                      value={json}
                      onChange={(e) => setJson(e.target.value)}
                      readOnly={!canEdit}
                      spellCheck={false}
                    />
                  </label>
                  <label className="field">
                    ব্যক্তিগত সম্পাদকীয় নোট
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={2000}
                    />
                  </label>
                  <label className="field">
                    ব্যক্তিগত সম্পাদকীয় ধাপ
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                    >
                      <option value="draft">খসড়া</option>
                      <option value="under_review">যাচাই চলছে</option>
                      <option value="ready">প্রকাশের প্রস্তুত</option>
                    </select>
                  </label>
                  <button
                    disabled={revision === 0}
                    onClick={async () => {
                      if (
                        await mutate("review", {
                          unit_id: unitId,
                          review_status: reviewStatus,
                          admin_notes: notes,
                          expected_revision: revision,
                        })
                      )
                        await load();
                    }}
                  >
                    পর্যালোচনার নোট সংরক্ষণ
                  </button>
                  <p className="small muted">
                    প্রস্তুত ধাপ স্বাধীন শিক্ষক যাচাই বা ডেপ্লয়ের দাবি নয়।
                  </p>
                  <div className="row">
                    <button
                      className="primary"
                      disabled={!canEdit}
                      onClick={() => {
                        try {
                          void saveDraft();
                        } catch {
                          setNotice("JSON সঠিক নয়।");
                        }
                      }}
                    >
                      খসড়া সংরক্ষণ
                    </button>
                    <button
                      onClick={() => {
                        try {
                          setUnit(Unit.parse(JSON.parse(json)));
                          setPreview(!preview);
                        } catch {
                          setNotice("গঠন যাচাই ব্যর্থ হয়েছে।");
                        }
                      }}
                    >
                      শিক্ষার্থী রূপে যাচাই
                    </button>
                  </div>
                  {preview && (
                    <div className="stack">
                      <h3>{unit.goal_bn}</h3>
                      <p>{unit.rule_bn}</p>
                      <p className="example" lang="en">
                        {unit.example_en}
                      </p>
                      {unit.exercises.map((a) => (
                        <Card key={a.id}>
                          <Activity
                            activity={a}
                            onDone={() => undefined}
                            onMistake={() => undefined}
                          />
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              )}
              <Card>
                <h2>জরুরি স্থগিত / পুনরায় চালু</h2>
                <p>
                  শিক্ষার্থীর কাছে শুধু বন্ধ আইটেমের ID যাবে। ব্যক্তিগত কারণ বা
                  কর্মীর তথ্য যাবে না। পরের পাঠ ফেচে স্থগিত প্রয়োগ হয়।
                </p>
                <label className="field">
                  পাঠ বা অনুশীলনের ID
                  <input
                    value={blockId}
                    onChange={(e) => setBlockId(e.target.value)}
                    placeholder="P0-01 অথবা P0-01-choice"
                  />
                </label>
                <div className="row">
                  <button
                    disabled={!canManage || !blockId}
                    onClick={() =>
                      setConfirm({
                        title: "এই আইটেম স্থগিত করবেন?",
                        action: () =>
                          mutate("block", { item_id: blockId, blocked: true }),
                      })
                    }
                  >
                    জরুরি স্থগিত
                  </button>
                  <button
                    disabled={!canManage || !blockId}
                    onClick={() =>
                      setConfirm({
                        title: "এই আইটেম আবার চালু করবেন?",
                        action: () =>
                          mutate("block", { item_id: blockId, blocked: false }),
                      })
                    }
                  >
                    আবার চালু
                  </button>
                </div>
                <p>বন্ধ: {info?.blocks.join(", ") || "কোনোটি নয়"}</p>
              </Card>
            </>
          )}
          {tab === "releases" && (
            <>
              <Card>
                <h2>নিরাপদ প্রকাশের ধাপ</h2>
                <p>
                  ১. সংশোধন রপ্তানি করুন। ২. নিরীক্ষা ও সংস্করণ তৈরি করুন। ৩.
                  অনুমোদিত Cloudflare ডেপ্লয় করুন। ৪. প্রকাশিত হ্যাশ যাচাই করুন।
                </p>
                <button disabled={!canEdit} onClick={() => void download()}>
                  পাবলিক-নিরাপদ সংশোধন রপ্তানি
                </button>
                <p className="small">
                  প্রস্তুত আর ডেপ্লয় হওয়া আলাদা। রপ্তানি বা ডাটাবেসে জমা মানে
                  সাইটে প্রকাশ নয়।
                </p>
                <label className="field">
                  নতুন সংস্করণ
                  <input
                    value={releaseId}
                    placeholder="3.0.1"
                    onChange={(e) => setReleaseId(e.target.value)}
                  />
                </label>
                <label className="field">
                  Manifest SHA-256
                  <input
                    value={digest}
                    onChange={(e) => setDigest(e.target.value)}
                  />
                </label>
                <div className="row">
                  <button
                    disabled={!canManage}
                    onClick={() =>
                      void mutate("release", {
                        id: releaseId,
                        manifest_sha256: digest,
                      })
                    }
                  >
                    ডেপ্লয়ের অপেক্ষায় রাখুন
                  </button>
                  <button
                    disabled={!canManage}
                    onClick={async () => {
                      try {
                        for (let batch = 0; batch < 4; batch++) {
                          const proof = await api<{ verified_batch: number }>(
                            "/admin/verify",
                            { id: releaseId, manifest_sha256: digest, batch },
                          );
                          if (proof.verified_batch !== batch)
                            throw Error("Verification failed");
                        }
                        setNotice(
                          "প্রকাশিত manifest ও সব পাঠের হ্যাশ মিলেছে। মালিক নিরাপদ SQL দিয়ে প্রকাশের রেকর্ড নিশ্চিত করবেন।",
                        );
                      } catch {
                        setNotice(
                          "প্রকাশ নিশ্চিত হয়নি। সংস্করণ ও হ্যাশ মিলিয়ে ডেপ্লয় পরীক্ষা করুন।",
                        );
                      }
                    }}
                  >
                    প্রকাশিত হ্যাশ যাচাই
                  </button>
                </div>
              </Card>
              <Card>
                <h2>সংস্করণের ইতিহাস</h2>
                {info?.releases.map((r) => (
                  <div key={r.id} className="card">
                    <h3>{r.id}</h3>
                    <p>
                      {r.state === "deployed"
                        ? "ডেপ্লয় রেকর্ড করা হয়েছে"
                        : r.state === "rollback_requested"
                          ? "আগের সংস্করণ ফেরানোর অনুরোধ"
                          : "ডেপ্লয়ের অপেক্ষায়"}
                    </p>
                    <code className="wrap">{r.manifest_sha256}</code>
                    <br />
                    <button
                      disabled={!canManage}
                      onClick={() =>
                        setConfirm({
                          title: "আগের সংস্করণ ফেরানোর অনুরোধ করবেন?",
                          action: () => mutate("rollback", { id: r.id }),
                        })
                      }
                    >
                      আগের সংস্করণ ফেরানোর অনুরোধ
                    </button>
                  </div>
                ))}
                <p>
                  আগের অপরিবর্তিত release রেখে manifest পুনঃডেপ্লয় ও হ্যাশ যাচাই
                  করতে হবে। অনুরোধ নিজে থেকে সাইট ফেরায় না। অগ্রগতি মুছে যাবে
                  না।
                </p>
              </Card>
            </>
          )}
          {tab === "ops" && (
            <>
              <Notice>
                সীমা ও সক্ষমতা শুধু দেখা তথ্য অনুযায়ী। কোনো বিলিং বা পেইড
                উন্নীতকরণ চালু হয় না। প্রতিদিন ব্যবহারকারী সর্বোচ্চ ২০ ও সাইট
                সর্বোচ্চ ২০০ AI অনুরোধ; প্রতি ব্যবহারকারী প্রতি মিনিটে ৪।
              </Notice>
              <Card>
                <h2>অনুরোধের হিসাব</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>পরিসর</th>
                        <th>অনুরোধ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {info?.usage.map((u, i) => (
                        <tr key={i}>
                          <td>{u.scope}</td>
                          <td>{u.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="small">
                  প্রকৃত সেবা কোটা ও DB/egress ব্যবহারের জন্য মালিকের
                  Cloudflare, Supabase ও provider dashboard দেখতে হবে।
                </p>
              </Card>
              <Card>
                <h2>সেবা পর্যবেক্ষণ</h2>
                {info?.health.length ? (
                  info.health.map((h) => (
                    <p key={h.provider}>
                      {h.provider}: {h.category}
                    </p>
                  ))
                ) : (
                  <p>
                    সেবা পর্যবেক্ষণের কোনো সংরক্ষিত ফল নেই। এটিকে সুস্থতার
                    প্রমাণ ধরা হবে না।
                  </p>
                )}
              </Card>
              <Card>
                <h2>নিরীক্ষা</h2>
                <Audit rows={info?.audit ?? []} />
              </Card>
            </>
          )}
          {tab === "support" && (
            <Card>
              <h2>সীমিত সহায়তা</h2>
              <p>
                শুধু অনুমোদিত প্রশাসক নাম ও অ্যাকাউন্ট ID দেখতে পারেন। ব্যক্তিগত
                AI লেখা এখানে নেই। ভূমিকা প্রদান ও স্থায়ী মুছে ফেলা মালিকের
                সুরক্ষিত অপারেশন।
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>অ্যাকাউন্ট ID</th>
                      <th>ডাকনাম</th>
                    </tr>
                  </thead>
                  <tbody>
                    {support.map((u) => (
                      <tr key={u.user_id}>
                        <td>{u.user_id}</td>
                        <td>{u.alias ?? "নেই"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>
      </div>
      {confirm && (
        <Dialog title={confirm.title} onClose={closeConfirm}>
          <p>এই পরিবর্তন অডিটে রেকর্ড হবে।</p>
          <div className="row">
            <button onClick={closeConfirm}>এখন নয়</button>
            <button
              className="primary"
              onClick={async () => {
                await confirm.action();
                setConfirm(null);
              }}
            >
              নিশ্চিত করি
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function Audit({ rows }: { rows: Overview["audit"] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>সময়</th>
            <th>কর্মী</th>
            <th>কাজ</th>
            <th>আইটেম</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{new Date(r.created_at).toLocaleString("bn-BD")}</td>
              <td>{r.actor}</td>
              <td>{r.action}</td>
              <td>{r.object_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
