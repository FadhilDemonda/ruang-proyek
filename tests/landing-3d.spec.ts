import { expect, test } from "@playwright/test";

test.describe("Landing page futuristic motion reel", () => {
  test("renders hero reel and workflow motion stages on desktop without errors or overflow", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });

    const heroStage = page.locator(".rp-reel-stage");
    await expect(heroStage).toBeVisible();
    const heroBox = await heroStage.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.width).toBeGreaterThan(250);
    expect(heroBox!.height).toBeGreaterThan(200);

    await expect(page.locator(".rp-reel-bg")).toBeVisible();
    await expect(page.locator(".rp-reel-frame")).toBeVisible();

    const stepCards = page.locator(".rp-step-card");
    await expect(stepCards).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      const stage = stepCards.nth(i).locator(".rp-step-stage");
      await stage.scrollIntoViewIfNeeded();
      await expect(stage).toBeVisible();
      const box = await stage.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(180);
      expect(box!.height).toBeGreaterThan(100);
    }

    const reelToggle = page.locator(".rp-reel-toggle");
    await expect(reelToggle).toHaveAttribute("aria-pressed", "false");
    await reelToggle.click();
    await expect(reelToggle).toHaveAttribute("aria-pressed", "true");
    await reelToggle.click();
    await expect(reelToggle).toHaveAttribute("aria-pressed", "false");

    const themeBtn = page.locator(".rp-theme-btn");
    await themeBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await themeBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test("matches workspace screenshots to the landing page theme", async ({ page }) => {
    await page.goto("/");
    const themeButton = page.locator(".rp-theme-btn");
    const previews = [
      ["Proyek", "proyek"],
      ["To-do", "tugas"],
      ["Request", "request"],
      ["Notes", "notes"],
    ];

    await themeButton.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    for (const [name, file] of previews) {
      await page.getByRole("tab", { name, exact: true }).click();
      const image = page.getByRole("tabpanel", { name, exact: true }).getByRole("img");
      await expect(image).toHaveAttribute("src", `/profil/${file}-dark.png`);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1280);
    }

    await page.reload();
    const projectsImage = page.getByRole("tabpanel", { name: "Proyek" }).getByRole("img");
    await expect(projectsImage).toHaveAttribute("src", "/profil/proyek-dark.png");
    await themeButton.click();
    await expect(projectsImage).toHaveAttribute("src", "/profil/proyek.png");
  });

  test("renders cleanly on mobile viewport without horizontal overflow", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => pageErrors.push(err));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator(".rp-reel-stage")).toBeVisible();
    await expect(page.locator(".rp-step-stage")).toHaveCount(3);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);
    expect(pageErrors).toEqual([]);
  });
});
