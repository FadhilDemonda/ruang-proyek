import { expect, test } from "@playwright/test";

test.describe("Produktivitas Harian & Integrasi Antar-Modul", () => {
  test("opens on Hari Ini (Overview) by default with accurate summaries and quick actions", async ({ page }, testInfo) => {
    const today = new Date().toLocaleDateString("en-CA");
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString("en-CA");

    await page.addInitScript(
      ({ todayStr, yesterdayStr }) => {
        localStorage.setItem("ruang-theme", "light");
        localStorage.setItem(
          "ruang-proyek-local-v1",
          JSON.stringify({
            projects: [
              {
                id: "p1",
                title: "Peluncuran Produk",
                description: "Target rilis kuartal ini",
                status: "Dikerjakan",
                date: todayStr,
                updatedAt: Date.now() - 2000,
              },
            ],
            todos: [
              {
                id: "t1",
                title: "Perbaiki bug pembayaran",
                status: "Dikerjakan",
                priority: "Tinggi",
                date: yesterdayStr,
                projectId: "p1",
                checklist: [
                  { id: "c1", text: "Cek log webhook", done: true },
                  { id: "c2", text: "Tambah retry", done: false },
                ],
                position: 1000,
              },
              {
                id: "t2",
                title: "Siapkan catatan rilis",
                status: "Belum Mulai",
                priority: "Sedang",
                date: todayStr,
                projectId: "p1",
                position: 2000,
              },
            ],
            requests: [
              {
                id: "r1",
                title: "Tambahkan ekspor CSV",
                status: "Baru",
                requester: "Tim Operasional",
                date: todayStr,
                updatedAt: Date.now() - 1000,
              },
            ],
            notes: [
              {
                id: "n1",
                title: "Ringkasan Rapat Rilis",
                content: "Semua fitur siap diuji minggu ini.",
                projectId: "p1",
                updatedAt: Date.now() - 500,
              },
            ],
          }),
        );
      },
      { todayStr: today, yesterdayStr: yesterday },
    );

    await page.goto("/workspace");
    await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Perbaiki bug pembayaran", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Siapkan catatan rilis", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Peluncuran Produk", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Tambahkan ekspor CSV", exact: true })).toBeVisible();
    await expect(page.getByText("Ringkasan Rapat Rilis")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("overview-hari-ini.png") });
  });

  test("supports To-do priority filtering and interactive checklist sub-tasks", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem("ruang-theme", "light");
      localStorage.setItem("ruang-view", "board");
      localStorage.setItem(
        "ruang-proyek-local-v1",
        JSON.stringify({
          projects: [{ id: "p1", title: "Proyek Utama", status: "Dikerjakan" }],
          todos: [
            {
              id: "t-low",
              title: "Rapikan dokumentasi",
              status: "Belum Mulai",
              priority: "Rendah",
              projectId: "p1",
              position: 1000,
            },
          ],
          requests: [],
          notes: [],
        }),
      );
    });

    await page.goto("/workspace?section=todos");
    await expect(page.getByRole("heading", { name: "To-do saya", exact: true })).toBeVisible();

    // Create a high-priority task with checklist items
    await page.getByRole("button", { name: "+ Tambah tugas", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Tambah To-do" });
    await dialog.getByLabel("Judul", { exact: true }).fill("Deploy versi baru");
    await dialog.getByRole("combobox", { name: "Prioritas tugas" }).click();
    await dialog.getByRole("option", { name: "Tinggi", exact: true }).click();
    await dialog.getByRole("button", { name: "+ Tambah sub-tugas", exact: true }).click();
    await dialog.getByLabel("Sub-tugas 1", { exact: true }).fill("Jalankan migrasi");
    await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(dialog).not.toBeVisible();

    // Filter by priority Tinggi
    await page.getByRole("combobox", { name: "Filter prioritas" }).click();
    await page.getByRole("option", { name: "Prioritas Tinggi", exact: true }).click();
    await expect(page.getByRole("button", { name: "Deploy versi baru", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rapikan dokumentasi", exact: true })).not.toBeVisible();

    // Open task detail and interact with checklist
    await page.getByRole("button", { name: "Deploy versi baru", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Checklist sub-tugas", exact: true })).toBeVisible();
    await expect(page.getByText("0/1 selesai (0%)")).toBeVisible();

    // Add another step inline
    await page.getByLabel("Tambah sub-tugas baru").fill("Verifikasi monitoring");
    await page.getByRole("button", { name: "+ Tambah sub-tugas", exact: true }).click();
    await expect(page.getByText("0/2 selesai (0%)")).toBeVisible();

    // Check first step
    await page.getByRole("checkbox", { name: "Jalankan migrasi" }).check();
    await expect(page.getByText("1/2 selesai (50%)")).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("todo-checklist-detail.png"), fullPage: true });
  });

  test("links Notes to Projects from project detail and filters Notes by project", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem("ruang-theme", "light");
      localStorage.setItem(
        "ruang-proyek-local-v1",
        JSON.stringify({
          projects: [
            { id: "p1", title: "Desain Ulang Web", status: "Dikerjakan" },
            { id: "p2", title: "Aplikasi Mobile", status: "Direncanakan" },
          ],
          todos: [],
          requests: [],
          notes: [
            {
              id: "n-standalone",
              title: "Ide Umum",
              content: "Catatan tanpa proyek",
              updatedAt: Date.now() - 5000,
            },
          ],
        }),
      );
    });

    await page.goto("/workspace?section=projects&detail=p1");
    await expect(page.getByRole("heading", { name: "Desain Ulang Web", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catatan proyek", exact: true })).toBeVisible();

    // Create a note linked to Desain Ulang Web
    await page.getByRole("button", { name: "Tambah catatan", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Proyek terkait catatan" })).toContainText("Desain Ulang Web");
    await page.getByLabel("Judul catatan").fill("Keputusan Tipografi");
    await page.getByLabel("Isi catatan").fill("Gunakan Plus Jakarta Sans untuk seluruh workspace.");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.locator(".workspace-toast")).toContainText("Catatan dibuat.");

    // Jump back to project via Buka proyek button
    await page.getByRole("button", { name: "Buka proyek", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Desain Ulang Web", exact: true })).toBeVisible();
    await expect(page.getByText("Keputusan Tipografi")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("project-linked-notes.png") });

    // Filter in Notes section by project
    await page.getByRole("navigation", { name: "Menu utama" }).getByRole("button", { name: "Notes", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter proyek catatan" }).click();
    await page.getByRole("option", { name: "Desain Ulang Web", exact: true }).click();
    await expect(page.getByRole("button", { name: "Buka catatan Keputusan Tipografi", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Buka catatan Ide Umum", exact: true })).not.toBeVisible();
  });

  test("shows Projects, To-dos, and Requests together in Calendar view", async ({ page }, testInfo) => {
    const today = new Date().toLocaleDateString("en-CA");
    await page.addInitScript((todayStr) => {
      localStorage.setItem("ruang-theme", "light");
      localStorage.setItem(
        "ruang-proyek-local-v1",
        JSON.stringify({
          projects: [
            { id: "p1", title: "Target Proyek Hari Ini", status: "Dikerjakan", date: todayStr },
          ],
          todos: [
            { id: "t1", title: "Tugas Jatuh Tempo", status: "Belum Mulai", date: todayStr, projectId: "p1", position: 1000 },
          ],
          requests: [
            { id: "r1", title: "Permintaan Klien", status: "Baru", date: todayStr, requester: "Budi" },
          ],
          notes: [],
        }),
      );
    }, today);

    await page.goto("/workspace?section=calendar");
    await expect(page.getByRole("heading", { name: "Kalender tenggat", exact: true })).toBeVisible();

    const agenda = page.locator(".calendar-agenda-list");
    await expect(agenda.getByRole("button", { name: "Target Proyek Hari Ini", exact: true })).toBeVisible();
    await expect(agenda.getByRole("button", { name: "Tugas Jatuh Tempo", exact: true })).toBeVisible();
    await expect(agenda.getByRole("button", { name: "Permintaan Klien", exact: true })).toBeVisible();

    // Filter to Proyek only
    await page.getByRole("group", { name: "Filter modul kalender" }).getByRole("button", { name: /^Proyek/ }).click();
    await expect(agenda.getByRole("button", { name: "Target Proyek Hari Ini", exact: true })).toBeVisible();
    await expect(agenda.getByRole("button", { name: "Tugas Jatuh Tempo", exact: true })).not.toBeVisible();

    // Back to Semua and add task on selected date
    await page.getByRole("group", { name: "Filter modul kalender" }).getByRole("button", { name: /^Semua/ }).click();
    await page.getByRole("button", { name: "Tambah tugas di tanggal ini", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Tambah To-do" });
    await expect(dialog.getByLabel("Tenggat")).toHaveValue(today);
    await page.keyboard.press("Escape");

    await page.screenshot({ path: testInfo.outputPath("calendar-view.png") });
  });

  test("opens Command Palette with Ctrl+K to search across modules and run quick actions", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem("ruang-theme", "light");
      localStorage.setItem(
        "ruang-proyek-local-v1",
        JSON.stringify({
          projects: [{ id: "p1", title: "Proyek Orion", status: "Dikerjakan" }],
          todos: [{ id: "t1", title: "Audit Keamanan Orion", status: "Belum Mulai", projectId: "p1", position: 1000 }],
          requests: [{ id: "r1", title: "Request Laporan Orion", status: "Baru", requester: "Sinta" }],
          notes: [{ id: "n1", title: "Catatan Arsitektur Orion", content: "Detail desain", projectId: "p1", updatedAt: Date.now() }],
        }),
      );
    });

    await page.goto("/workspace");
    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: "Pencarian global dan perintah cepat" });
    await expect(palette).toBeVisible();

    const searchInput = palette.getByRole("textbox", { name: "Cari di seluruh ruang kerja" });
    await searchInput.fill("Orion");

    await expect(palette.getByRole("option", { name: /^Proyek Orion/ })).toBeVisible();
    await expect(palette.getByRole("option", { name: /^Audit Keamanan Orion/ })).toBeVisible();
    await expect(palette.getByRole("option", { name: /^Request Laporan Orion/ })).toBeVisible();
    await expect(palette.getByRole("option", { name: /^Catatan Arsitektur Orion/ })).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("command-palette.png") });

    // Open the Note directly via Command Palette
    await palette.getByRole("option", { name: /Catatan Arsitektur Orion/ }).click();
    await expect(palette).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Catatan Arsitektur Orion", exact: true })).toBeVisible();
  });
});
