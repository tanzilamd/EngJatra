import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
function localToken(id: string) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated", aud: "authenticated" })}.local-test-signature`;
}
test("dedicated sign-in/signup/reset flows have one primary action, labelled validation and truthful confirmation", async ({
  page,
}) => {
  await page.route("http://localhost:54321/auth/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      status: path.endsWith("/token") ? 400 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        path.endsWith("/token")
          ? { error_code: "invalid_credentials", msg: "invalid credentials" }
          : path.endsWith("/signup")
            ? {
                user: { id: "local-test-user", email: "qa@example.test" },
                session: null,
              }
            : {},
      ),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "আবার স্বাগতম" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "লগইন", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "লগইন", exact: true }).click();
  await expect(page.getByText("একটি সঠিক ইমেইল ঠিকানা দাও।")).toBeVisible();
  await page.getByLabel("ইমেইল", { exact: true }).fill("qa@example.test");
  await page.getByLabel("পাসওয়ার্ড", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "পাসওয়ার্ড দেখাও" }).click();
  await expect(page.getByLabel("পাসওয়ার্ড", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "লগইন", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("লগইন হয়নি");
  await expect(
    page.getByRole("button", { name: "লগইন", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করো", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ইংরেজি শেখা শুরু হোক" }),
  ).toBeVisible();
  await expect(page.getByLabel("পাসওয়ার্ড", { exact: true })).toHaveAttribute(
    "autocomplete",
    "new-password",
  );
  await page.getByLabel("পাসওয়ার্ড", { exact: true }).fill("short");
  await page
    .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করো", exact: true })
    .click();
  await expect(
    page.getByText("পাসওয়ার্ডে অন্তত ৮টি অক্ষর দরকার।"),
  ).toBeVisible();
  await page.getByLabel("পাসওয়ার্ড", { exact: true }).fill("test-password");
  await page
    .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করো", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "ইনবক্স দেখে নাও" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "অ্যাকাউন্ট নিশ্চিত করার ইমেইল পেলে তার লিংক খুলে নাও। নিশ্চিত করার পরই শেখা শুরু করতে পারবে।",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/auth-confirmation.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: "test-results/auth-confirmation-dark-320.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "লগইনে ফিরে যাই" }).click();
  await page.getByRole("button", { name: "পাসওয়ার্ড ভুলে গেছি" }).click();
  await expect(page.getByLabel("পাসওয়ার্ড", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "test-results/auth-reset.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "লিংক পাঠাও" }).click();
  await expect(
    page.getByText("এই ইমেইলে অ্যাকাউন্ট থাকলে পাসওয়ার্ড বদলানোর লিংক পাবে।"),
  ).toBeVisible();
});
test("authentication stays accessible and aligned in both themes at phone, tablet and desktop sizes", async ({
  page,
}) => {
  test.setTimeout(60000);
  for (const [service, origin] of [
    ["student", "http://localhost:5180"],
    ["admin", "http://localhost:5181"],
  ]) {
    await page.goto(origin);
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page
            .getByRole("group", { name: "রঙের ধরন" })
            .getByRole("button")
            .evaluateAll((buttons) =>
              buttons.every((button) => {
                const size = button.getBoundingClientRect();
                return size.width >= 44 && size.height >= 44;
              }),
            ),
        ).toBe(true);
        expect(
          await page
            .getByLabel("ইমেইল", { exact: true })
            .evaluate((input) => parseFloat(getComputedStyle(input).fontSize)),
        ).toBeGreaterThanOrEqual(16);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await page.screenshot({
          path: `test-results/${service === "admin" ? "admin-" : ""}auth-${theme}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
});

test("expired recovery opens a useful reset flow and network failures unlock the form", async ({
  page,
}) => {
  await page.route("http://localhost:54321/auth/v1/**", (route) =>
    route.abort(),
  );
  await page.goto("/?recovery=1");
  await expect(
    page.getByRole("heading", { name: "পাসওয়ার্ড ভুলে গেছ?" }),
  ).toBeVisible();
  await page.getByLabel("ইমেইল", { exact: true }).fill("qa@example.test");
  await page.getByRole("button", { name: "লিংক পাঠাও" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "লিংক পাঠাও" })).toBeEnabled();
});

test("recovery callback stays in the password flow and never reports an unsuccessful update as saved", async ({
  page,
}) => {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "qa@example.test",
    email_confirmed_at: "2026-10-10T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
  };
  const token = localToken(user.id);
  let updates = 0;
  await page.route("http://localhost:54321/auth/v1/user", async (route) => {
    if (route.request().method() === "PUT" && ++updates === 1) {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ error_code: "weak_password", msg: "rejected" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });
  await page.goto(
    `/?recovery=1#access_token=${token}&refresh_token=local-test-refresh&expires_in=3600&token_type=bearer&type=recovery`,
  );
  await expect(
    page.getByRole("heading", { name: "নতুন পাসওয়ার্ড দাও" }),
  ).toBeVisible();
  await page
    .getByLabel("পাসওয়ার্ড", { exact: true })
    .fill("local-test-password");
  await page.getByRole("button", { name: "পাসওয়ার্ড সংরক্ষণ করো" }).click();
  await expect(
    page.getByText("পাসওয়ার্ড বদলায়নি। লিংকের মেয়াদ শেষ হলে নতুন লিংক নাও।"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "নতুন পাসওয়ার্ড সংরক্ষিত" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "পাসওয়ার্ড সংরক্ষণ করো" }).click();
  await expect(
    page.getByRole("heading", { name: "নতুন পাসওয়ার্ড সংরক্ষিত" }),
  ).toBeVisible();
  await page.route("http://localhost:54321/auth/v1/logout**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.getByRole("button", { name: "লগইনে ফিরে যাই" }).click();
  await expect(
    page.getByRole("heading", { name: "আবার স্বাগতম" }),
  ).toBeVisible();
});
test("confirmation resend is throttled locally, handles provider limits honestly and permits email correction", async ({
  page,
}) => {
  await page.clock.install();
  let resends = 0;
  await page.route("http://localhost:54321/auth/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/resend")) {
      resends++;
      expect(route.request().postDataJSON()).toMatchObject({
        type: "signup",
        email: "qa@example.test",
      });
    }
    await route.fulfill({
      status: path.endsWith("/resend") && resends === 1 ? 429 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        path.endsWith("/signup")
          ? { user: { id: "local-test-user" }, session: null }
          : path.endsWith("/resend") && resends === 1
            ? { msg: "rate limited" }
            : {},
      ),
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করো", exact: true })
    .click();
  await page.getByLabel("ইমেইল", { exact: true }).fill("qa@example.test");
  await page.getByLabel("পাসওয়ার্ড", { exact: true }).fill("test-password");
  await page
    .getByRole("button", { name: "অ্যাকাউন্ট তৈরি করো", exact: true })
    .click();
  const resend = page.getByRole("button", {
    name: "নিশ্চিত করার লিংক আবার চাই",
  });
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(61000);
  await resend.click();
  await expect(page.getByRole("alert")).toContainText("অল্প সময়ে");
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(61000);
  await resend.click();
  await expect(
    page.getByText(
      "এই ঠিকানায় নিশ্চিত করার অপেক্ষায় থাকা অ্যাকাউন্ট থাকলে নতুন লিংক পাবে।",
    ),
  ).toBeVisible();
  expect(resends).toBe(2);
  await page.getByRole("button", { name: "ইমেইল ঠিকানা বদলাই" }).click();
  await expect(page.getByLabel("ইমেইল", { exact: true })).toHaveValue(
    "qa@example.test",
  );
  await expect(page.getByLabel("পাসওয়ার্ড", { exact: true })).toHaveValue("");
});
test("expired or reused callback displays safe guidance without reflecting provider text", async ({
  page,
}) => {
  await page.goto(
    "/#error=access_denied&error_code=otp_expired&error_description=private-provider-message",
  );
  await expect(page.getByRole("alert")).toContainText("মেয়াদ শেষ হলে");
  await expect(page.getByText("private-provider-message")).toHaveCount(0);
});
test("unconfirmed sessions fail closed and provider-confirmed Google sessions enter onboarding directly", async ({
  page,
}) => {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "qa@example.test",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: {},
    email_confirmed_at: null as string | null,
  };
  const token = localToken(user.id);
  await page.route("http://localhost:54321/auth/v1/user", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    }),
  );
  await page.route("**/api/learning/snapshot", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        revision: 0,
        state: {
          unit_id: "P0-01",
          step: 0,
          release: "3.0.0",
          completed: [],
          words: [],
          mistakes: [],
          attempts: [],
          onboarded: false,
          tour: false,
          hints: true,
          large_text: false,
          keep_history: false,
        },
      }),
    }),
  );
  const callback = `/#access_token=${token}&refresh_token=local-test-refresh&expires_in=3600&token_type=bearer&type=signup`;
  await page.goto(callback);
  await expect(
    page.getByRole("heading", { name: "আবার স্বাগতম" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "একদম নতুন — শূন্য থেকে শুরু" }),
  ).toHaveCount(0);
  await page.evaluate(() => localStorage.clear());
  user.email_confirmed_at = "2026-10-10T00:00:00Z";
  await page.goto(`/?qa-return=1${callback.slice(1)}`);
  await expect(
    page.getByRole("button", { name: "একদম নতুন — শূন্য থেকে শুরু" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ইনবক্স দেখে নাও" }),
  ).toHaveCount(0);
});
test("welcome UI renders before the Auth SDK is ready and keeps actions disabled until initialization", async ({
  page,
}) => {
  let release: () => void = () => undefined;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*supabase_supabase-js.js*", async (route) => {
    await hold;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "আবার স্বাগতম" }),
    ).toBeVisible();
    await expect(
      page.getByText("অ্যাকাউন্টের সংযোগ প্রস্তুত হচ্ছে…"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "লগইন", exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(
    page.getByRole("button", { name: "লগইন", exact: true }),
  ).toBeEnabled();
});

test("recovery that expires during editing offers a working route to request a new link", async ({
  page,
}) => {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "qa@example.test",
    email_confirmed_at: "2026-10-10T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
  };
  await page.route("http://localhost:54321/auth/v1/user", (route) =>
    route.fulfill({
      status: route.request().method() === "PUT" ? 401 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        route.request().method() === "PUT" ? { msg: "expired token" } : user,
      ),
    }),
  );
  await page.route("http://localhost:54321/auth/v1/logout**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto(
    `/?recovery=1#access_token=${localToken(user.id)}&refresh_token=local-test-refresh&expires_in=3600&token_type=bearer&type=recovery`,
  );
  await page
    .getByLabel("পাসওয়ার্ড", { exact: true })
    .fill("local-test-password");
  await page.getByRole("button", { name: "পাসওয়ার্ড সংরক্ষণ করো" }).click();
  await page.getByRole("button", { name: "লগইনে ফিরে নতুন লিংক চাই" }).click();
  await expect(
    page.getByRole("heading", { name: "আবার স্বাগতম" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "পাসওয়ার্ড ভুলে গেছি" }).click();
  await expect(page.getByRole("button", { name: "লিংক পাঠাও" })).toBeVisible();
});
