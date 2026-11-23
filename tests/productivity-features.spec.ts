import { expect, test } from "@playwright/test";

test.describe("Produktivitas Harian & Integrasi Antar-Modul", () => {
  test("opens Hari Ini with tasks first and secondary information on demand", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
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
    const overview = page.locator(".overview-page");
    await expect(overview.getByRole("button", { name: "Tambahkan ekspor CSV", exact: true })).not.toBeVisible();
    await expect(overview.getByText("Ringkasan Rapat Rilis")).not.toBeVisible();

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ["light", "dark"]) {
        if (await page.locator("html").getAttribute("data-theme") !== theme) {
          await page.getByRole("button", { name: theme === "dark" ? "Aktifkan mode gelap" : "Aktifkan mode terang", exact: true }).click();
        }
        await expect(overview).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `.impeccable/review/overview-${width}-${theme}.png`, fullPage: true, animations: "disabled" });
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Aktifkan mode terang", exact: true }).click();

    await overview.getByRole("button", { name: "Tambah tugas", exact: true }).click();
    const taskDialog = page.getByRole("dialog", { name: "Tambah To-do" });
    await expect(taskDialog.getByLabel("Tenggat")).toHaveValue(today);
    await page.keyboard.press("Escape");
    await expect(taskDialog).not.toBeVisible();

    const projects = overview.locator("details").filter({ has: page.locator("summary", { hasText: "Proyek aktif" }) });
    await projects.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(projects.getByRole("button", { name: "Peluncuran Produk", exact: true })).toBeVisible();
    await projects.getByRole("button", { name: "Tambah proyek", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Tambah Proyek" })).toBeVisible();
    await page.keyboard.press("Escape");

    const requests = overview.locator("details").filter({ has: page.locator("summary", { hasText: "Request baru" }) });
    await requests.locator("summary").click();
    for (const target of ["proyek", "to-do"]) {
      await requests.getByRole("button", { name: `Jadikan ${target}`, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Judul", { exact: true })).toHaveValue("Tambahkan ekspor CSV");
      await page.keyboard.press("Escape");
    }

    await overview.locator("summary", { hasText: "Catatan terakhir" }).click();
    await expect(overview.getByRole("button", { name: "Ringkasan Rapat Rilis", exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: ".impeccable/review/overview-expanded.png", fullPage: true, animations: "disabled" });

    await overview.getByRole("combobox", { name: "Status Perbaiki bug pembayaran" }).click();
    await page.getByRole("option", { name: "Selesai", exact: true }).click();
    await expect(overview.getByRole("button", { name: "Perbaiki bug pembayaran", exact: true })).not.toBeVisible();
    await expect(page.locator(".workspace-toast")).toContainText("Status to-do tersimpan.");

    const destinations = [
      ["Kalender", null, /section=calendar/],
      ["Semua to-do", null, /section=todos/],
      ["Siapkan catatan rilis", null, /section=todos&detail=t2/],
      ["Peluncuran Produk", "Proyek aktif", /section=projects&detail=p1/],
      ["Kanban", "Proyek aktif", /section=todos&project=p1/],
      ["Semua proyek", "Proyek aktif", /section=projects/],
      ["Tambahkan ekspor CSV", "Request baru", /section=requests&detail=r1/],
      ["Semua request", "Request baru", /section=requests/],
      ["Ringkasan Rapat Rilis", "Catatan terakhir", /section=notes&detail=n1/],
      ["Buat catatan", "Catatan terakhir", /section=notes&detail=/],
      ["Semua notes", "Catatan terakhir", /section=notes/],
    ] as const;
    for (const [label, disclosure, destination] of destinations) {
      if (disclosure) {
        const panel = overview.locator("details").filter({ has: page.locator("summary", { hasText: disclosure }) });
        if (await panel.getAttribute("open") === null) await panel.locator("summary").click();
      }
      await overview.getByRole("button", { name: label, exact: true }).click();
      await expect(page).toHaveURL(destination);
      await page.goBack();
      await expect(overview).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("keeps the focus list bounded without hiding remaining tasks", async ({ page }) => {
    const today = new Date().toLocaleDateString("en-CA");
    await page.addInitScript((date) => {
      localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({
        projects: [], notes: [], requests: [],
        todos: [
          ...Array.from({ length: 7 }, (_, index) => ({ id: `t${index}`, title: `Tugas ${index}`, date, status: "Belum Mulai" })),
          { id: "done", title: "Sudah selesai", date, status: "Selesai" },
          { id: "future", title: "Nanti saja", date: "2099-12-31", status: "Belum Mulai" },
        ],
      }));
    }, today);
    await page.goto("/workspace");
    await expect(page.locator(".overview-task")).toHaveCount(5);
    const more = page.getByRole("button", { name: "Lihat 2 tugas lainnya" });
    await more.click();
    await expect(page.locator(".overview-task")).toHaveCount(7);
    await page.getByRole("button", { name: "Tampilkan lebih sedikit" }).click();
    await expect(page.locator(".overview-task")).toHaveCount(5);
    await expect(page.getByText("Sudah selesai", { exact: true })).not.toBeVisible();
    await expect(page.getByText("Nanti saja", { exact: true })).not.toBeVisible();
  });

  test("keeps empty and unreadable workspaces usable on a narrow screen", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.addInitScript(() => localStorage.setItem("ruang-proyek-local-v1", "invalid-json"));
    await page.goto("/workspace");
    await expect(page.locator(".content").getByRole("alert")).toContainText("Data lokal tidak dapat dibaca.");
    await expect(page.getByRole("heading", { name: "Hari ini masih lapang." })).toBeVisible();
    for (const summary of await page.locator(".overview-disclosure summary").all()) await summary.click();
    await expect(page.getByText("Belum ada proyek aktif.")).toBeVisible();
    await expect(page.getByText("Tidak ada request baru.", { exact: true })).toBeVisible();
    await expect(page.getByText("Belum ada catatan.", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: ".impeccable/review/overview-empty-error.png", fullPage: true, animations: "disabled" });
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
    await expect(page.locator(".note-save-pill")).toHaveText("Tersimpan");

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
