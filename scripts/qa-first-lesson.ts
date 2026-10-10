import { expect, type Page } from "@playwright/test";
// Exact authored P0-01 activities shared by demo and controlled live QA.
export async function completeFirstLessonActivities(page: Page) {
  for (const choice of ["I am fine, thank you.", "am", "I am fine."]) {
    await page.getByRole("button", { name: choice, exact: true }).click();
    await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
    await expect(page.getByText("সঠিক হয়েছে!", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  }
  for (const token of ["Hello,", "I", "am", "Rina."])
    await page
      .locator(".row")
      .getByRole("button", { name: token, exact: true })
      .click();
  await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page.getByLabel("তোমার লেখা", { exact: true }).fill("Hi, I am Sami.");
  await page.getByText("উদাহরণ ও নিজের লেখা যাচাই", { exact: true }).click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page.getByRole("button", { name: "নিজের লেখা যাচাই করেছি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  for (const [en, bn] of [
    ["hello", "হ্যালো"],
    ["goodbye", "বিদায়"],
    ["morning", "সকাল"],
    ["fine", "ভালো"],
  ])
    await page
      .getByRole("combobox", { name: en, exact: true })
      .selectOption(bn);
  await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page
    .getByRole("button", { name: "হ্যালো, আমি রিনা।", exact: true })
    .click();
  await page.getByRole("button", { name: "উত্তর যাচাই করি" }).click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
  await page
    .getByRole("button", { name: "I am fine, thank you.", exact: true })
    .click();
  await page.getByRole("button", { name: "পরের ধাপে যাই" }).click();
}
