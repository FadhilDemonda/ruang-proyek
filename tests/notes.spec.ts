import { expect, test, type Page } from "@playwright/test";

async function openLegacyWorkspace(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("ruang-theme", "light");
    localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({
      projects: [{ id: "project-1", title: "Proyek lama", status: "Direncanakan" }],
      todos: [],
      requests: [],
    }));
  });
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { name: "Proyek saya" })).toBeVisible();
}

test.describe("Notes", () => {
  test("opens from navigation and safely handles saved workspace data without notes", async ({ page }) => {
    await openLegacyWorkspace(page);
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "Notes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
    await expect(page.getByText("Belum ada catatan")).toBeVisible();
    await expect(page.getByText("Buat catatan pertama untuk menyimpan ide, konteks, atau keputusan penting.")).toBeVisible();
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "Proyek", exact: true }).click();
    await expect(page.getByRole("region", { name: "Proyek" })
      .getByRole("button", { name: "Proyek lama", exact: true })).toBeVisible();
  });

  test("creates, saves, discards, and deletes a note through its detail screen", async ({ page }, testInfo) => {
    await openLegacyWorkspace(page);
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "Notes", exact: true }).click();
    await page.locator(".notes-page > .heading")
      .getByRole("button", { name: "Tambah catatan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catatan baru", exact: true })).toBeVisible();
    await page.getByLabel("Judul catatan").fill("Rencana mingguan");
    await page.getByLabel("Isi catatan").fill("Susun prioritas hari Senin.");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByRole("button", { name: "Hapus catatan", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("note-detail.png"), fullPage: true });
    await page.getByLabel("Isi catatan").fill("Perubahan yang belum disimpan");
    await page.getByRole("button", { name: "Kembali ke Notes", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Buang perubahan?", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Buang perubahan", exact: true }).click();
    const noteCard = page.getByRole("button", { name: "Buka catatan Rencana mingguan", exact: true });
    await expect(noteCard).toBeVisible();
    await noteCard.click();
    await expect(page.getByLabel("Isi catatan")).toHaveValue("Susun prioritas hari Senin.");
    await page.getByLabel("Isi catatan").fill("Perubahan sebelum pindah halaman");
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "To-do", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Buang perubahan?", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Tetap edit", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rencana mingguan", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "To-do", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Buang perubahan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "To-do saya", exact: true })).toBeVisible();
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "Notes", exact: true }).click();
    await page.getByRole("button", { name: "Buka catatan Rencana mingguan", exact: true }).click();
    await expect(page.getByLabel("Isi catatan")).toHaveValue("Susun prioritas hari Senin.");
    await page.getByRole("button", { name: "Hapus catatan", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Hapus Rencana mingguan?", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Batal", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Rencana mingguan", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Hapus catatan", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hapus", exact: true }).click();
    await expect(page.getByText("Belum ada catatan")).toBeVisible();
  });

  test("uses a responsive grid without horizontal overflow", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({
        projects: [], todos: [], requests: [],
        notes: [
          { id: "1", title: "Satu", content: "Isi satu", updatedAt: 1 },
          { id: "2", title: "Dua", content: "Isi dua", updatedAt: 2 },
          { id: "3", title: "Tiga", content: "Isi tiga", updatedAt: 3 },
        ],
      }));
    });
    await page.goto("/workspace");
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "Notes", exact: true }).click();
    const grid = page.getByRole("list", { name: "Daftar catatan" });
    await expect(grid).toHaveCSS("grid-template-columns", /\S+px \S+px \S+px/);
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(grid).toHaveCSS("grid-template-columns", /\S+px \S+px/);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(grid).toHaveCSS("grid-template-columns", /\S+px/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("notes-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("notes-desktop.png"), fullPage: true });
  });

  test("supports search, sort, direct writing without an edit button, live counters, save indicator, and quick switcher", async ({ page }, testInfo) => {
    const now = Date.now();
    await page.addInitScript((ts) => {
      localStorage.setItem("ruang-theme", "light");
      localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({
        projects: [], todos: [], requests: [],
        notes: [
          { id: "n1", title: "Catatan Beta", content: "Isi catatan beta lama", updatedAt: ts - 10_000 },
          { id: "n2", title: "Catatan Alpha", content: "Dua kata", updatedAt: ts - 1_000 },
        ],
      }));
    }, now);
    await page.goto("/workspace");
    await page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "Notes", exact: true }).click();

    await expect(page.locator(".notes-count-pill")).toContainText("2");
    await page.screenshot({ path: testInfo.outputPath("notes-list-light.png"), fullPage: true });

    await page.getByRole("textbox", { name: "Cari catatan" }).fill("Alpha");
    await expect(page.getByRole("button", { name: "Buka catatan Catatan Alpha", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buka catatan Catatan Beta", exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "Hapus pencarian catatan", exact: true }).click();

    await page.getByRole("group", { name: "Urutan catatan" })
      .getByRole("button", { name: "Judul A–Z", exact: true }).click();
    const firstCard = page.getByRole("list", { name: "Daftar catatan" }).locator("article").first();
    await expect(firstCard).toContainText("Catatan Alpha");

    await page.getByRole("button", { name: "Buka catatan Catatan Alpha", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Edit/i })).toHaveCount(0);
    await expect(page.locator(".note-save-pill")).toHaveText("Tersimpan");

    await page.getByLabel("Isi catatan").fill("Satu dua tiga empat");
    await expect(page.locator(".note-save-pill")).toHaveText("Belum disimpan");
    await expect(page.locator(".note-stat-cell").filter({ hasText: "Kata" })).toContainText("4");

    await page.keyboard.press("Control+s");
    await expect(page.locator(".note-save-pill")).toHaveText("Tersimpan");
    await page.screenshot({ path: testInfo.outputPath("notes-detail-light.png"), fullPage: true });

    await page.getByLabel("Isi catatan").fill("Ubah sebelum pindah catatan");
    await page.getByRole("navigation", { name: "Beralih catatan" })
      .getByRole("button", { name: /Catatan Beta/ }).click();
    await expect(page.getByRole("dialog", { name: "Buang perubahan?", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Buang perubahan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Catatan Beta", exact: true })).toBeVisible();
  });
});
