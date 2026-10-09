const base = process.env.ENGJATRA_LIVE_API;
const token = process.env.ENGJATRA_SMOKE_TOKEN;
if (!base || !token)
  throw Error(
    "NOT RUN: configure ENGJATRA_LIVE_API and ENGJATRA_SMOKE_TOKEN securely.",
  );
if (!base.startsWith("https://")) throw Error("HTTPS required");
const publicResult = await fetch(`${base}/api/health`);
if (!publicResult.ok) throw Error("Health failed");
const health = await publicResult.json();
if (health.local_demo) throw Error("Live environment must not use demo");
const anonymous = await fetch(`${base}/api/learning/snapshot`);
if (anonymous.status !== 401) throw Error("Anonymous access not rejected");
const snapshot = await fetch(`${base}/api/learning/snapshot`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!snapshot.ok) throw Error("Authenticated snapshot failed");
const admin = await fetch(`${base}/api/admin/overview`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (admin.status !== 403)
  throw Error("Use a learner token: admin negative check failed");
console.log(
  "PASS live health, learner read, anonymous rejection, learner admin rejection. Other live QA gates remain separate.",
);
export {};
