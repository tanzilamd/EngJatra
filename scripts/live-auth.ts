import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect, type Page } from "@playwright/test";
import { settings } from "./deployment-config";
import { redactLog } from "./redact-log";
import { liveBrowserOptions } from "./live-browser-options";
import { reviewerFixtureQuery } from "./live-auth-fixture";

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
          email_confirm: true,
          user_metadata: { engjatra_test_fixture: true },
        },
        undefined,
        true,
      );
      fixtures.push({ id: created.id, email, password, token: "" });
      const session = await supabase(
        "/auth/v1/token?grant_type=password",
        "POST",
        { email, password },
      );
      if (!session.access_token)
        throw Error("Actual QA password sign-in yielded no session");
      fixtures[i].token = session.access_token;
    }
    const context = await browser.newContext();
    const page = await context.newPage();
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
    await expect(page.getByText("সংরক্ষিত হয়েছে", { exact: true })).toBeVisible(
      { timeout: 30000 },
    );
    const snapshot = await api("/learning/snapshot", fixtures[0].token);
    const state = await snapshot.json();
    if (!snapshot.ok || state.state?.step !== 1)
      throw Error(
        "Actual Worker persisted progress differs from browser lesson",
      );
    const secondContext = await browser.newContext();
    const restored = await secondContext.newPage();
    await login(restored, config.student, fixtures[0]);
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "শব্দের সঙ্গে বন্ধুত্ব" }),
    ).toBeVisible();
    await restored.reload();
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "শব্দের সঙ্গে বন্ধুত্ব" }),
    ).toBeVisible();
    // Actual production SW + an authenticated account, not mocked transport.
    await restored.evaluate(() => navigator.serviceWorker.ready);
    await expect(
      restored.getByText("সংরক্ষিত হয়েছে", { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await secondContext.setOffline(true);
    await restored.reload();
    await restored.getByRole("button", { name: "শেখা চালিয়ে যাও" }).click();
    await expect(
      restored.getByRole("heading", { name: "শব্দের সঙ্গে বন্ধুত্ব" }),
    ).toBeVisible();
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
    if ((await api("/admin/overview", fixtures[0].token)).status !== 403)
      throw Error("Learner access to admin operation was not denied");
    checks.push(
      "real browser password login; all six tracks/96 lesson links; authored lesson navigation; Worker checkpoint/save; fresh-context restore and refresh; two-user isolation/RLS; learner admin rejection",
    );
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
    await login(adminPage, config.admin, fixtures[1]);
    await expect(adminPage.getByRole("navigation")).toBeVisible({
      timeout: 30000,
    });
    const staff = await api("/admin/session", fixtures[1].token);
    if (!staff.ok || (await staff.json()).role !== "content_reviewer")
      throw Error("Real server-side reviewer authorization failed");
    const unauthorizedContext = await browser.newContext();
    const unauthorized = await unauthorizedContext.newPage();
    await login(unauthorized, config.admin, fixtures[0]);
    await expect(
      unauthorized.getByText("এই অ্যাকাউন্টে প্রশাসনের অনুমতি নেই।", {
        exact: true,
      }),
    ).toBeVisible();
    checks.push(
      "separate Admin login; real least-privileged reviewer session/read dashboard; learner UI access denied; no owner/editor role or production content mutations",
    );
    await context.close();
    await secondContext.close();
    await unauthorizedContext.close();
  } catch (error) {
    console.error(
      redactLog((error as Error).message, {
        ...process.env,
        QA_ADMIN_KEY: privileged,
      }),
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
      checks,
      created_fixtures: fixtures.length,
      deleted_fixtures: deleted,
      not_tested: [
        "real registration email delivery/confirmation",
        "Google OAuth",
        "AI providers",
        "verified owner bootstrap or content publishing mutations",
      ],
    };
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
}
