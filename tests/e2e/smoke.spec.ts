import { expect, test } from "@playwright/test";

test("health endpoint responds with status ok (FR-070)", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok" });
});

test("landing page renders (S-1 smoke)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("WhiteboardAssistant");
  await page.screenshot({ path: ".artifacts/s1/landing.png", fullPage: true });
});
