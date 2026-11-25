import { expect, test } from "@playwright/test";

test.describe("Workspace sidebar compact navigation & sliding pill", () => {
  test("caps project shortcuts with see-all link, keeps compact + button, no scrollbar, and animates active pill", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "ruang-proyek-local-v1",
        JSON.stringify({
          projects: [
            { id: "p1", title: "MCU PT IWS", status: "Dikerjakan" },
            { id: "p2", title: "GEMINI", status: "Dikerjakan" },
            { id: "p3", title: "RESPON TIME HDUL", status: "Direncanakan" },
            { id: "p4", title: "PROYEK EMPAT", status: "Direncanakan" },
            { id: "p5", title: "PROYEK LIMA", status: "Selesai" },
          ],
          todos: [],
          requests: [],
          notes: [],
        }),
      );
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/workspace?section=projects");

    const aside = page.locator("aside");
    const navWrap = aside.locator(".sidebar-navigation");
    await expect(navWrap).toHaveAttribute("data-pill-ready", "true");

    // 1. Shortcuts capped at 3 + "Lihat semua (5)" shown
    await expect(aside.locator(".project-nav-item")).toHaveCount(3);
    const seeAll = aside.getByRole("button", { name: "Lihat semua proyek" });
    await expect(seeAll).toBeVisible();
    await expect(seeAll).toContainText("Lihat semua (5)");

    // 2. Compact + button (<= 30px)
    const addBox = await aside.locator(".project-add").boundingBox();
    expect(addBox).not.toBeNull();
    expect(addBox!.width).toBeLessThanOrEqual(30);
    expect(addBox!.height).toBeLessThanOrEqual(30);

    // 3. Fixed sidebar fits without vertical overflow / scrollbar
    const hasVertOverflow = await navWrap.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(hasVertOverflow).toBe(false);

    // 4. Sliding pill tracks active button transitions smoothly
    const pill = navWrap.locator(".sidebar-active-pill");
    const notesBtn = aside.getByRole("button", { name: "Notes", exact: true });
    await notesBtn.click();
    await expect(notesBtn).toHaveClass(/active/);
    await expect(pill).toHaveClass(/is-animated/);
    await page.waitForTimeout(340);

    const notesBox = await notesBtn.boundingBox();
    const pillBoxNotes = await pill.boundingBox();
    expect(notesBox).not.toBeNull();
    expect(pillBoxNotes).not.toBeNull();
    expect(Math.abs(pillBoxNotes!.y - notesBox!.y)).toBeLessThanOrEqual(2);

    // 5. Clicking a project shortcut moves pill there, then "Lihat semua (5)" goes back to Proyek
    const firstProject = aside.locator(".project-nav-item").first();
    await firstProject.click();
    await expect(firstProject).toHaveClass(/active/);
    await page.waitForTimeout(340);

    const projItemBox = await firstProject.boundingBox();
    const pillBoxProj = await pill.boundingBox();
    expect(Math.abs(pillBoxProj!.y - projItemBox!.y)).toBeLessThanOrEqual(2);

    await seeAll.click();
    await expect(page.getByRole("heading", { name: "Proyek saya" })).toBeVisible();
  });
});
