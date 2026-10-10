import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect, type Page } from "@playwright/test";
import { settings } from "./deployment-config";
import { redactLog } from "./redact-log";
import { liveBrowserOptions } from "./live-browser-options";
import { reviewerFixtureQuery } from "./live-auth-fixture";
import { completeFirstLessonActivities } from "./qa-first-lesson";
import { messages } from "../packages/contracts/api";
import { validateProductionTutor } from "./live-ai-result";

// Credentials remain in process memory. Only newly created disposable QA
// identities are mutated/deleted; no existing learner or owner role is touched.
await mkdir(".wrangler", { recursive: true });
const reportPath = ".wrangler/live-auth.local.json";
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  const report = {
    status: "NOT VERIFIED",
    reason:
      "SUPABASE_ACCESS_TOKEN is not bound in this runtime; public-site verification is separate",
  };
  await writeFile(reportPath, JSON.stringify(report));
  console.log(JSON.stringify(report));
} else {
  const config = settings({
    ...process.env,
    GEMMA_FREE_CONFIRMED: "false",
    LLAMA_FREE_CONFIRMED: "false",
  });
  const project = new URL(config.supabase).hostname.split(".")[0];
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${project}/api-keys`,
    {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok)
    throw Error(`QA Auth Management key access HTTP ${response.status}`);
  const keys = (await response.json()) as {
    name: string;
    type: string;
    api_key: string;
  }[];
  const privileged = keys.find(
    (key) => key.name === "service_role" && key.type === "legacy",
  )?.api_key;
  if (!privileged)
    throw Error(
      "No suitable in-memory QA Auth administrator credential; never substitute a browser key",
    );
  const fixtures: {
    id: string;
    email: string;
    password: string;
    token: string;
  }[] = [];
  const browser = await chromium.launch(liveBrowserOptions());
  const checks: string[] = [];
  let deleted = 0;
  let phase = "preflight";
  let aiVerified = false;
  let aiRegionDenied = false;
  let aiCountry: string | undefined;
  let diagnosticPage: Page | undefined;
  async function supabase(
    path: string,
    method = "GET",
    body?: unknown,
    token?: string,
    admin = false,
  ) {
    const headers: Record<string, string> = {
      apikey: admin ? privileged! : config.publicKey,
      "Content-Type": "application/json",
    };
    if (admin || token)
      headers.Authorization = `Bearer ${admin ? privileged : token}`;
    const result = await fetch(`${config.supabase}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
    if (!result.ok)
      throw Error(`QA Supabase HTTP ${result.status} (${path.split("?")[0]})`);
    const text = await result.text();
    return text ? JSON.parse(text) : null;
  }
  async function api(path: string, token: string, body?: unknown) {
    return fetch(`${config.api}/api${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: config.student,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
  }
  async function login(
    page: Page,
    origin: string,
    fixture: (typeof fixtures)[number],
  ) {
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.getByLabel("ইমেইল", { exact: true }).fill(fixture.email);
    await page.getByLabel("পাসওয়ার্ড", { exact: true }).fill(fixture.password);
    await page.getByRole("button", { name: "লগইন", exact: true }).click();
  }
  try {
    // Check public transport before creating users, avoiding stranded fixtures on egress denial.
    for (const origin of [config.student, config.admin, config.api]) {
      const result = await fetch(
        `${origin}${origin === config.api ? "/api/health" : "/"}`,
        { redirect: "error", signal: AbortSignal.timeout(15000) },
      );
      if (!result.ok) throw Error(`QA public transport HTTP ${result.status}`);
    }
    for (let i = 0; i < 2; i++) {
      const email = `engjatra-qa-${randomUUID()}@example.invalid`,
        password = randomBytes(32).toString("base64url");
      const created = await supabase(
        "/auth/v1/admin/users",
        "POST",
        {
          email,
          password,
          email_confirm: i !== 0,
          user_metadata: { engjatra_test_fixture: true },
        },
        undefined,
        true,
      );
      fixtures.push({ id: created.id, email, password, token: "" });
      if (i === 0) {
        const rejected = await fetch(
          `${config.supabase}/auth/v1/token?grant_type=password`,
          {
            method: "POST",
            headers: {
              apikey: config.publicKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
            signal: AbortSignal.timeout(15000),
          },
        );
        const denied = (await rejected.json()) as {
          error_code?: string;
          access_token?: string;
        };
        if (
          rejected.status !== 400 ||
          denied.error_code !== "email_not_confirmed" ||
          denied.access_token
        )
          throw Error(
            "Unconfirmed password identity was not denied by Supabase",
          );
        // Provider-issued signup token tests confirmation and single use, not
        // SMTP/inbox delivery. Never send test mail to an uncontrolled inbox.
        const link = await supabase(
          "/auth/v1/admin/generate_link",
          "POST",
          { type: "signup", email, password },
          undefined,
          true,
        );
        if (
          link.id !== created.id ||
          link.verification_type !== "signup" ||
          !link.hashed_token
        )
          throw Error(
            "Confirmation token must belong only to the new QA fixture",
          );
        await supabase("/auth/v1/verify", "POST", {
          type: "signup",
          token_hash: link.hashed_token,
        });
        const reused = await fetch(`${config.supabase}/auth/v1/verify`, {
          method: "POST",
          headers: {
            apikey: config.publicKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "signup",
            token_hash: link.hashed_token,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (reused.ok)
          throw Error("A used confirmation token was accepted again");
        checks.push(
          "real Supabase denies unconfirmed password login, accepts provider-issued signup token once; no delivery claim",
        );
      }
      const session = await supabase(
        "/auth/v1/token?grant_type=password",
        "POST",
        { email, password },
      );
      if (!session.access_token)
        throw Error("Actual QA password sign-in yielded no session");
      fixtures[i].token = session.access_token;
    }
    // Recovery token issuance/consumption and password replacement are confined
    // to a new fixture; no real user's password or email is touched.
    const recoveryLink = await supabase(
      "/auth/v1/admin/generate_link",
      "POST",
      { type: "recovery", email: fixtures[0].email },
      undefined,
      true,
    );
    if (
      recoveryLink.id !== fixtures[0].id ||
      recoveryLink.verification_type !== "recovery" ||
      !recoveryLink.hashed_token
    )
      throw Error("Recovery token must belong only to the new QA fixture");
    const recoverySession = await supabase("/auth/v1/verify", "POST", {
      type: "recovery",
      token_hash: recoveryLink.hashed_token,
    });
    if (!recoverySession.access_token)
      throw Error("Recovery token produced no session");
    fixtures[0].token = recoverySession.access_token;
    fixtures[0].password = randomBytes(32).toString("base64url");
    await supabase(
      "/auth/v1/user",
      "PUT",
      { password: fixtures[0].password },
      fixtures[0].token,
    );
    const relogin = await supabase(
      "/auth/v1/token?grant_type=password",
      "POST",
      { email: fixtures[0].email, password: fixtures[0].password },
    );
    fixtures[0].token = relogin.access_token;
    checks.push(
      "real provider recovery token/password replacement and password relogin for disposable fixture; no recovery email delivery claim",
    );
    const context = await browser.newContext();
    const page = await context.newPage();
    phase = "learner login and first lesson";
    diagnosticPage = page;
    await login(page, config.student, fixtures[0]);
    await page
      .getByRole("button", { name: "একদম নতুন — শূন্য থেকে শুরু" })
      .click();
    await page
      .getByRole("button", { name: "এখন বাদ দিই", exact: true })
      .click();
    await page
      .getByRole("navigation", { name: "মূল পথ" })
      .getByRole("button", { name: "শেখা", exact: true })
      .click();
    for (const band of ["Pre-A1", "A1", "A2", "B1", "B2", "C1"]) {
      await page.getByRole("button", { name: band, exact: true }).click();
      await expect(page.locator(".unit-link")).toHaveCount(16);
    }
    await page
      .getByRole("navigation", { name: "মূল পথ" })
      .getByRole("button", { name: "হোম", exact: true })
      .click();
    await page.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      page.getByRole("heading", { name: "হ্যালো বলি" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
    await expect(
      page.getByRole("heading", { name: "শব্দের সঙ্গে বন্ধুত্ব" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "পরে অনুশীলন করব" }).first().click();
    await expect(page.getByText("সংরক্ষিত হয়েছে", { exact: true })).toBeVisible(
      { timeout: 30000 },
    );
    const snapshot = await api("/learning/snapshot", fixtures[0].token);
    const state = await snapshot.json();
    if (!snapshot.ok || state.state?.step !== 1)
      throw Error(
        "Actual Worker persisted progress differs from browser lesson",
      );
    checks.push(
      "real password login, six tracks/96 links, lesson navigation and Worker/Supabase step-one persistence",
    );
    const secondContext = await browser.newContext();
    const restored = await secondContext.newPage();
    phase = "fresh-context progress restore";
    diagnosticPage = restored;
    await login(restored, config.student, fixtures[0]);
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "শব্দের সঙ্গে বন্ধুত্ব" }),
    ).toBeVisible();
    phase = "online progress reload";
    await restored.reload();
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "শব্দের সঙ্গে বন্ধুত্ব" }),
    ).toBeVisible();
    checks.push(
      "fresh-context password login restores the saved step and survives online reload",
    );
    // Actual production SW + an authenticated account, not mocked transport.
    await restored.evaluate(() => navigator.serviceWorker.ready);
    await expect(
      restored.getByText("সংরক্ষিত হয়েছে", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    phase = "authenticated offline lesson reload";
    const offlineSession = await secondContext.newCDPSession(restored);
    await offlineSession.send("Network.enable");
    await secondContext.setOffline(true);
    // Chromium can reset navigator state on reload while transport stays blocked.
    // Use native Chromium network state as well; never spoof a JS property or
    // relax the application's fail-closed online suspension check.
    await offlineSession.send("Network.overrideNetworkState", {
      offline: true,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await restored.reload();
    await offlineSession.send("Network.overrideNetworkState", {
      offline: true,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await expect
      .poll(() => restored.evaluate(() => navigator.onLine))
      .toBe(false);
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "শব্দের সঙ্গে বন্ধুত্ব" }),
    ).toBeVisible();
    phase = "offline checkpoint and reconnect";
    await restored.getByRole("button", { name: "পরের ধাপে যাই" }).click();
    await expect(
      restored.getByRole("heading", { name: "পড়ে বুঝি" }),
    ).toBeVisible();
    await expect(
      restored.getByText("সংরক্ষণ বাকি — সংযোগ ফিরে এলে পাঠানো হবে", {
        exact: true,
      }),
    ).toBeVisible();
    await secondContext.setOffline(false);
    await offlineSession.send("Network.overrideNetworkState", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await expect(
      restored.getByText("সংরক্ষিত হয়েছে", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const reconnected = await api("/learning/snapshot", fixtures[0].token);
    const reconnectedState = await reconnected.json();
    if (!reconnected.ok || reconnectedState.state?.step !== 2)
      throw Error("Actual offline/reconnect checkpoint did not persist");
    checks.push(
      "real authenticated cached lesson survives offline reload; pending checkpoint reconnects and persists through the production Worker/Supabase",
    );
    phase = "authored first-lesson completion and saved vocabulary";
    await restored.getByRole("button", { name: "পরের ধাপে যাই" }).click();
    await completeFirstLessonActivities(restored);
    if (process.env.GEMMA_FREE_CONFIRMED === "true") {
      // Only after the same pipeline's explicit eligibility and synthetic
      // pre-publication inference gate; no account/session text is submitted.
      phase = "permitted authenticated production AI";
      await restored
        .getByRole("checkbox", { name: /আমার বয়স অন্তত ১৮ বছর/ })
        .check();
      await restored
        .getByLabel("তোমার ইংরেজি উত্তর")
        .fill("I goes to the market.");
      const received = restored.waitForResponse(
        (r) =>
          r.url() === `${config.api}/api/ai/tutor` &&
          r.request().method() === "POST",
      );
      await restored
        .getByRole("button", { name: "উত্তর পাঠাই", exact: true })
        .click();
      const response = await received;
      if (!response.ok()) throw Error("Production AI request failed");
      const result = validateProductionTutor(
        await response.json(),
        process.env.GEMMA_ALLOWED_COUNTRIES ?? "",
      );
      if (result.inference_verified) {
        await expect(
          restored.getByText(result.reply.short_explanation_bn, {
            exact: true,
          }),
        ).toBeVisible();
        checks.push(
          "real authenticated production inference: schema-validated English/Bengali correction rendered through the tutor; synthetic practice text only",
        );
        aiVerified = true;
      } else {
        await expect(
          restored.getByText(messages.AI_REGION_UNAVAILABLE, { exact: true }),
        ).toBeVisible();
        aiRegionDenied = true;
        aiCountry = result.country;
        checks.push(
          "real authenticated production regional denial and authored continuation; allowed-country inference remains NOT VERIFIED",
        );
      }
    }
    // Authored practice remains available independently of eligible inference.
    await restored.getByRole("button", { name: "এখন পাঠ শেষ করি" }).click();
    await restored
      .getByRole("button", { name: "পাঠ শেষ করে পথে ফিরি" })
      .click();
    await expect(
      restored.getByText("সংরক্ষিত হয়েছে", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const completed = await (
      await api("/learning/snapshot", fixtures[0].token)
    ).json();
    if (
      completed.state?.completed?.filter((id: string) => id === "P0-01")
        .length !== 1 ||
      completed.state.unit_id !== "P0-02" ||
      completed.state.words.length !== 1 ||
      completed.state.attempts.length !== 7
    )
      throw Error(
        "Real first-lesson completion/saved word/attempt records do not match authored browser practice",
      );
    await restored
      .getByRole("navigation", { name: "মূল পথ" })
      .getByRole("button", { name: "অগ্রগতি", exact: true })
      .click();
    await restored
      .getByRole("button", { name: "মনে করে শব্দ অনুশীলন করি" })
      .click();
    await restored
      .getByLabel("তোমার মনে পড়া অর্থ")
      .fill(completed.state.words[0].bn);
    await restored.getByRole("button", { name: "অর্থ দেখাও" }).click();
    await restored
      .getByRole("button", { name: "অর্থটি মনে করতে পেরেছি" })
      .click();
    await expect(
      restored.getByText("সংরক্ষিত হয়েছে", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const reviewed = await (
      await api("/learning/snapshot", fixtures[0].token)
    ).json();
    if (
      reviewed.state.words[0].stage !== 1 ||
      Date.parse(reviewed.state.words[0].due_at) <= Date.now()
    )
      throw Error("Real saved-vocabulary review scheduling did not persist");
    await restored.reload();
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "নাম জানাই" }),
    ).toBeVisible();
    checks.push(
      "real authored seven-activity lesson completion, unique completion record, saved word/revision schedule and next-unit restore; no provider inference",
    );
    phase = "real logout/relogin and retained progress";
    await restored.getByRole("button", { name: "সেটিংস", exact: true }).click();
    await restored.getByRole("button", { name: "বের হই", exact: true }).click();
    await expect(
      restored.getByRole("heading", { name: "আবার স্বাগতম" }),
    ).toBeVisible();
    await login(restored, config.student, fixtures[0]);
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "নাম জানাই" }),
    ).toBeVisible();
    const loggedInAgain = await supabase(
      "/auth/v1/token?grant_type=password",
      "POST",
      { email: fixtures[0].email, password: fixtures[0].password },
    );
    fixtures[0].token = loggedInAgain.access_token;
    checks.push(
      "real browser logout/password relogin preserves completed lesson, next-unit resume and saved-word revision state",
    );
    const other = await api("/learning/snapshot", fixtures[1].token);
    const otherState = await other.json();
    if (!other.ok || otherState.state?.step !== 0)
      throw Error("Live Worker second-user state isolation failed");
    const rows = await supabase(
      `/rest/v1/learner_paths?user_id=eq.${fixtures[0].id}&select=user_id`,
      "GET",
      undefined,
      fixtures[1].token,
    );
    if (!Array.isArray(rows) || rows.length)
      throw Error("Cross-user live RLS read was not empty");
    phase = "direct cross-user RLS write";
    await expect(
      restored.getByText("সংরক্ষিত হয়েছে", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const protectedSnapshot = await (
      await api("/learning/snapshot", fixtures[0].token)
    ).json();
    const crossWrite = await fetch(
      `${config.supabase}/rest/v1/learner_paths?user_id=eq.${fixtures[0].id}`,
      {
        method: "PATCH",
        headers: {
          apikey: config.publicKey,
          Authorization: `Bearer ${fixtures[1].token}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ state: { onboarded: false } }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (
      crossWrite.status !== 403 &&
      !(crossWrite.ok && JSON.stringify(await crossWrite.json()) === "[]")
    )
      throw Error("Cross-user RLS update was not denied/empty");
    const unchanged = await (
      await api("/learning/snapshot", fixtures[0].token)
    ).json();
    if (JSON.stringify(unchanged) !== JSON.stringify(protectedSnapshot))
      throw Error(
        "Cross-user update altered the other disposable learner state",
      );
    checks.push(
      "direct live RLS cross-user write denied/empty and original fixture snapshot unchanged",
    );
    if ((await api("/admin/overview", fixtures[0].token)).status !== 403)
      throw Error("Learner access to admin operation was not denied");
    checks.push(
      "real browser password login; all six tracks/96 lesson links; authored lesson navigation; Worker checkpoint/save; fresh-context restore and refresh; two-user isolation/RLS; learner admin rejection",
    );
    phase = "least-privileged admin reads";
    // Temporary least-privileged reviewer on this new QA identity only.
    const membership = await fetch(
      `https://api.supabase.com/v1/projects/${project}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: reviewerFixtureQuery(fixtures[1].id, fixtures[1].email),
          read_only: false,
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!membership.ok)
      throw Error(
        `Disposable reviewer setup requires authorized Management database write; HTTP ${membership.status}`,
      );
    const roles = await membership.json();
    if (
      !Array.isArray(roles) ||
      roles.length !== 1 ||
      roles[0].role !== "content_reviewer"
    )
      throw Error(
        "Disposable marked reviewer setup was not confirmed; no existing user adoption permitted",
      );
    const adminPage = await context.newPage();
    diagnosticPage = adminPage;
    await login(adminPage, config.admin, fixtures[1]);
    await expect(adminPage.getByRole("navigation")).toBeVisible({
      timeout: 30000,
    });
    const staff = await api("/admin/session", fixtures[1].token);
    if (!staff.ok || (await staff.json()).role !== "content_reviewer")
      throw Error("Real server-side reviewer authorization failed");
    for (const name of ["প্রতিবেদন", "সম্পাদনা", "প্রকাশ", "পরিচালনা"]) {
      await adminPage
        .getByRole("navigation")
        .getByRole("button", { name, exact: true })
        .click();
      await expect(
        adminPage.getByRole("heading", { level: 1, name, exact: true }),
      ).toBeVisible();
      if (name === "সম্পাদনা") {
        const preview = await api("/admin/content?id=P0-01", fixtures[1].token);
        if (!preview.ok)
          throw Error(`Reviewer content read HTTP ${preview.status}`);
        const published = await preview.json();
        if (published.unit?.id !== "P0-01")
          throw Error("Reviewer content read returned unexpected unit");
        await adminPage
          .getByRole("button", { name: "পাঠ খুলুন", exact: true })
          .click();
        await expect(
          adminPage.getByRole("heading", { name: "হ্যালো বলি", exact: true }),
        ).toBeVisible();
      }
    }
    const unauthorizedContext = await browser.newContext();
    const unauthorized = await unauthorizedContext.newPage();
    await login(unauthorized, config.admin, fixtures[0]);
    await expect(
      unauthorized.getByText("এই অ্যাকাউন্টে প্রশাসনের অনুমতি নেই।", {
        exact: true,
      }),
    ).toBeVisible();
    checks.push(
      "separate Admin login; real least-privileged reviewer dashboard/reports/content preview/release/ops reads; learner UI access denied; no owner/editor role or production content mutations",
    );
    await context.close();
    await secondContext.close();
    await unauthorizedContext.close();
  } catch (error) {
    console.error(`Controlled live QA phase: ${phase}`);
    if (diagnosticPage) {
      try {
        console.error(
          JSON.stringify(
            await diagnosticPage.evaluate(async () => ({
              online: navigator.onLine,
              serviceWorkerControlsPage: !!navigator.serviceWorker.controller,
              publicSuspensionSnapshotPresent: Object.keys(localStorage).some(
                (key) => key.startsWith("engjatra.public-suspensions."),
              ),
              cachedFirstLesson: !!(await (
                await caches.open("engjatra-public-content-v2")
              ).match("/content/3.0.0/P0/P0-01.json")),
              knownHeadings: [...document.querySelectorAll("h1,h2")]
                .map((heading) => heading.textContent)
                .filter((text) =>
                  [
                    "আবার স্বাগতম",
                    "হ্যালো বলি",
                    "শব্দের সঙ্গে বন্ধুত্ব",
                    "পড়ে বুঝি",
                    "এই পাঠ এখন খোলা যাচ্ছে না",
                    "পাঠ খুঁজে খুলুন",
                    "সম্পাদনা",
                  ].includes(text ?? ""),
                ),
            })),
          ),
        );
      } catch {
        /* Failure diagnostics never access keys or private page content. */
      }
    }
    console.error(
      redactLog((error as Error).message, process.env, [
        privileged,
        ...fixtures.flatMap((fixture) => [fixture.password, fixture.token]),
      ]),
    );
    process.exitCode = 1;
  } finally {
    for (const fixture of fixtures) {
      try {
        await supabase(
          `/auth/v1/admin/users/${fixture.id}`,
          "DELETE",
          undefined,
          undefined,
          true,
        );
        deleted++;
      } catch {
        console.error(
          "New disposable QA fixture cleanup failed; no existing account deletion attempted",
        );
        process.exitCode = 1;
      }
    }
    await browser.close();
    const report = {
      status: process.exitCode ? "FAILED" : "VERIFIED",
      phase,
      checks,
      created_fixtures: fixtures.length,
      deleted_fixtures: deleted,
      ai: {
        enabled: process.env.GEMMA_FREE_CONFIRMED === "true",
        inference_verified: aiVerified,
        regional_denial_verified: aiRegionDenied,
        observed_country: aiCountry,
      },
      not_tested: [
        "real registration/resend/recovery email delivery (provider tokens separately verified)",
        "Google OAuth",
        ...(aiVerified
          ? []
          : [
              aiRegionDenied
                ? "AI inference from an allowed Bangladesh production browser; this real runner was correctly denied by the country policy"
                : process.env.GEMMA_FREE_CONFIRMED === "true"
                  ? "Enabled production AI did not verify inference or regional denial; diagnose the failed tutor check"
                  : "AI providers: eligibility/activation gate remains disabled",
            ]),
        "real owner login or production content publishing mutations",
      ],
    };
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
}
