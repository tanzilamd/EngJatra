import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const [service, port] of [
  ["student", 5177],
  ["admin", 5178],
] as const) {
  test(`${service} actual Worker assets preserve SPA, headers and safe production auth`, async ({
    page,
    request,
  }) => {
    const base = `http://localhost:${port}`;
    const root = await request.get(base);
    const route = await request.get(`${base}/learn`);
    expect(route.status()).toBe(200);
    expect(await route.text()).toBe(await root.text());
    expect(root.headers()["x-frame-options"]).toBe("DENY");
    expect(root.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    await page.goto(`${base}/learn`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /ডেমো/ })).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (service === "student") {
      const manifestResponse = await request.get(
        `${base}/content/manifest.json`,
      );
      expect(manifestResponse.headers()["content-type"]).toContain(
        "application/json",
      );
      const manifest = await manifestResponse.json();
      expect(manifest.levels).toHaveLength(6);
      const unit = await request.get(
        `${base}/content/${manifest.version}/P0/P0-01.json`,
      );
      expect((await unit.json()).id).toBe("P0-01");
      expect(unit.headers()["cache-control"]).toContain("immutable");
    }
  });
}
