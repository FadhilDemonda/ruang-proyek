import { expect, test, type Locator, type Page } from "@playwright/test";

async function openWorkspace(page: Page, theme: "light" | "dark" = "light") {
  await page.addInitScript((savedTheme) => {
    localStorage.setItem("ruang-theme", savedTheme);
    localStorage.setItem("ruang-view", "board");
    localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({
      projects: [],
      requests: [],
      todos: [
        { id: "queued", title: "Tugas antrean", status: "Belum Mulai", position: 1000 },
        { id: "working", title: "Tugas berjalan", status: "Dikerjakan", position: 1000 },
        { id: "review", title: "Tugas ditinjau", status: "On Review", position: 1000 },
        { id: "done", title: "Tugas tuntas", status: "Selesai", position: 1000 },
      ],
    }));
  }, theme);
  await page.goto("/workspace?section=projects");
  await expect(page.getByRole("heading", { name: "Proyek saya" })).toBeVisible();
}

async function contrastRatio(locator: Locator, kind: "text" | "focus") {
  return locator.evaluate((element, contrastKind) => {
    function luminance(color: string) {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      return rgb.reduce((sum, channel, index) => {
        const value = channel / 255;
        const linear = value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
      }, 0);
    }
    const style = getComputedStyle(element);
    let background: Element | null = contrastKind === "focus"
      ? element.parentElement
      : element;
    while (background) {
      const color = getComputedStyle(background).backgroundColor;
      if (color !== "transparent" && color !== "rgba(0, 0, 0, 0)") break;
      background = background.parentElement;
    }
    const foreground = luminance(contrastKind === "focus" ? style.outlineColor : style.color);
    const behind = luminance(background ? getComputedStyle(background).backgroundColor : "rgb(255, 255, 255)");
    return (Math.max(foreground, behind) + 0.05) / (Math.min(foreground, behind) + 0.05);
  }, kind);
}

for (const theme of ["light", "dark"] as const) {
  test(`workspace and modal errors are readable in ${theme} mode`, async ({ page }, testInfo) => {
    await openWorkspace(page, theme);
    await page.getByRole("button", { name: "+ Tambah proyek", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Tambah Proyek" });
    await dialog.getByLabel("Judul", { exact: true }).fill("   ");
    await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Judul wajib diisi.");
    const noticeContrast = await contrastRatio(page.locator(".message.error"), "text");
    const dialogContrast = await contrastRatio(dialog.getByRole("alert"), "text");
    expect(noticeContrast).toBeGreaterThanOrEqual(4.5);
    expect(dialogContrast).toBeGreaterThanOrEqual(4.5);
    console.log(`${theme} error contrast: notice ${noticeContrast.toFixed(2)}:1; modal ${dialogContrast.toFixed(2)}:1`);
    await page.screenshot({ path: testInfo.outputPath(`errors-${theme}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test(`desktop sidebar focus is visible in ${theme} mode`, async ({ page }, testInfo) => {
    await openWorkspace(page, theme);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const button = page.getByRole("navigation", { name: "Menu utama" })
      .getByRole("button", { name: "Hari Ini", exact: true });
    await expect(button).toBeFocused();
    expect(await button.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    expect(await button.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    expect(await button.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThan(0);
    const contrast = await contrastRatio(button, "focus");
    expect(contrast).toBeGreaterThanOrEqual(3);
    console.log(`${theme} sidebar focus contrast: ${contrast.toFixed(2)}:1`);
    await page.screenshot({ path: testInfo.outputPath(`sidebar-${theme}.png`) });
  });

  test(`mobile menu focus is visible in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWorkspace(page, theme);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const dialog = page.getByRole("dialog", { name: "Menu ruang kerja" });
    const button = dialog.getByRole("button", { name: "Hari Ini", exact: true });
    await expect(button).toBeFocused();
    expect(await button.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    expect(await button.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    expect(await button.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThan(0);
    expect(await contrastRatio(button, "focus")).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
}

test("sidebar shows five recently updated projects and scrolls without a scrollbar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.addInitScript(() => {
    const projects = [3, 6, 2, 5, 1, 4].map((number) => ({
      id: `p${number}`,
      title: `Proyek ${number}`,
      status: "Direncanakan",
      updatedAt: number === 1 ? undefined : number * 1000,
    }));
    localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({ projects, todos: [], requests: [], notes: [] }));
  });
  await page.goto("/workspace?section=projects&detail=p1");

  const sidebar = page.getByRole("complementary", { name: "Navigasi ruang kerja" });
  const shortcuts = sidebar.getByRole("navigation", { name: "Proyek saya" });
  await expect(shortcuts.getByRole("button")).toHaveText([
    "Proyek 6", "Proyek 5", "Proyek 4", "Proyek 3", "Proyek 2",
  ]);
  await expect(sidebar.getByRole("button", { name: "Proyek", exact: true })).toHaveAttribute("aria-current", "page");

  const navigation = sidebar.locator(".sidebar-navigation");
  await expect(navigation).toHaveCSS("scrollbar-width", "none");
  await navigation.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => navigation.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await sidebar.getByRole("button", { name: "Lihat semua proyek" }).click();
  await expect(page.getByRole("heading", { name: "Proyek saya" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 480 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Menu ruang kerja" });
  await expect(drawer.locator(".sidebar-navigation")).toHaveCSS("scrollbar-width", "none");
  await expect(drawer.getByRole("navigation", { name: "Proyek saya" }).getByRole("button")).toHaveCount(5);
});

test.describe("mobile Kanban", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await openWorkspace(page);
    await page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "To-do", exact: true }) })
      .getByRole("button", { name: "To-do", exact: true }).click();
    await expect(page.getByRole("heading", { name: "To-do saya" })).toBeVisible();
  });

  test("status filters reveal their matching column and tasks", async ({ page }, testInfo) => {
    const filters = page.getByRole("group", { name: "Filter status tugas" });
    for (const [status, title] of [
      ["Dikerjakan", "Tugas berjalan"],
      ["On Review", "Tugas ditinjau"],
      ["Selesai", "Tugas tuntas"],
      ["Belum Mulai", "Tugas antrean"],
    ]) {
      await filters.getByRole("button", { name: status, exact: true }).tap();
      await expect(page.getByRole("region", { name: `Kolom ${status}`, exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: title, exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("mobile-kanban.png"), fullPage: true });
  });

  test("changing column keeps an active status filter in sync", async ({ page }) => {
    const filters = page.getByRole("group", { name: "Filter status tugas" });
    await filters.getByRole("button", { name: "Dikerjakan", exact: true }).tap();
    await page.getByRole("combobox", { name: "Kolom Kanban" }).tap();
    await page.getByRole("option", { name: "Tugas Selesai", exact: true }).tap();
    await expect(filters.getByRole("button", { name: "Selesai", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Tugas tuntas", exact: true })).toBeVisible();
  });

  test("changing column preserves the all-status filter", async ({ page }) => {
    const filters = page.getByRole("group", { name: "Filter status tugas" });
    await page.getByRole("combobox", { name: "Kolom Kanban" }).tap();
    await page.getByRole("option", { name: "Tugas Selesai", exact: true }).tap();
    await expect(filters.getByRole("button", { name: /^Semua/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Tugas tuntas", exact: true })).toBeVisible();
  });
});

test("existing workspace controls still work without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await openWorkspace(page);

  await page.getByRole("button", { name: "Aktifkan mode gelap" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Aktifkan mode terang" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Tutup sidebar" }).click();
  await expect(page.locator(".app")).toHaveClass(/sidebar-collapsed/);
  await page.getByRole("button", { name: "Buka sidebar" }).click();

  await page.getByRole("button", { name: "+ Tambah proyek", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Judul", { exact: true }).fill("Audit proyek");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const toast = page.locator(".workspace-toast");
  await expect(toast).toContainText("Proyek dibuat.");
  await expect(page.locator(".workspace-toast-slot")).toHaveCSS("position", "fixed");
  const toastBounds = await toast.boundingBox();
  expect(toastBounds!.y).toBeLessThan(32);
  expect(1280 - toastBounds!.x - toastBounds!.width).toBeLessThan(32);
  await page.getByRole("button", { name: "Audit proyek", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Audit proyek", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit proyek", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Batal", exact: true }).click();
  await page.getByRole("button", { name: "Buka Kanban proyek", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Audit proyek", exact: true })).toBeVisible();
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByRole("button", { name: "Audit proyek", exact: true })).toBeVisible();
  await breadcrumb.getByRole("button", { name: "Audit proyek", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Audit proyek", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit proyek", exact: true })).toBeVisible();

  await page.getByRole("navigation", { name: "Menu utama" }).getByRole("button", { name: "To-do", exact: true }).click();
  await page.getByRole("button", { name: "Tampilan Daftar" }).click();
  const filters = page.getByRole("group", { name: "Filter status tugas" });
  await filters.getByRole("button", { name: "Dikerjakan", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tugas berjalan", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tugas antrean", exact: true })).not.toBeVisible();
  await page.getByRole("textbox", { name: "Cari tugas" }).fill("tidak-cocok");
  await expect(page.getByText("Belum ada tugas untuk ditampilkan.")).toBeVisible();
  await page.getByRole("button", { name: "Hapus pencarian" }).click();
  await filters.getByRole("button", { name: /^Semua/ }).click();

  await page.getByRole("button", { name: "+ Tambah tugas", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Judul", { exact: true }).fill("Audit tugas");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const task = page.getByRole("article").filter({ has: page.getByRole("button", { name: "Audit tugas", exact: true }) });
  await task.getByRole("combobox", { name: "Status Audit tugas" }).click();
  await page.getByRole("option", { name: "Dikerjakan", exact: true }).click();
  await expect(task.getByText("Dikerjakan", { exact: true }).first()).toBeVisible();
  await task.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Judul", { exact: true }).fill("Audit tugas diperbarui");
  await page.getByRole("dialog").getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(toast).toContainText("Perubahan tersimpan.");
  await page.getByRole("button", { name: "Hapus Audit tugas diperbarui", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Audit tugas diperbarui", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hapus Audit tugas diperbarui", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(toast).toContainText("To-do dihapus.");
  await toast.getByRole("button", { name: "Tutup notifikasi" }).click();
  await expect(toast).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Audit tugas diperbarui", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Tampilan Kanban" }).click();
  const colTodo = page.getByRole("region", { name: "Kolom Belum Mulai", exact: true });
  const colProgress = page.getByRole("region", { name: "Kolom Dikerjakan", exact: true });
  const colReview = page.getByRole("region", { name: "Kolom On Review", exact: true });
  const colDone = page.getByRole("region", { name: "Kolom Selesai", exact: true });
  await expect(colTodo).toBeVisible();
  await expect(colProgress).toBeVisible();
  await expect(colReview).toBeVisible();
  await expect(colDone).toBeVisible();
  const [boxTodo, boxProgress, boxReview, boxDone] = await Promise.all([
    colTodo.boundingBox(),
    colProgress.boundingBox(),
    colReview.boundingBox(),
    colDone.boundingBox(),
  ]);
  expect(boxTodo!.x).toBeLessThan(boxProgress!.x);
  expect(boxProgress!.x).toBeLessThan(boxReview!.x);
  expect(boxReview!.x).toBeLessThan(boxDone!.x);

  await page.getByRole("navigation", { name: "Menu utama" }).getByRole("button", { name: "Request", exact: true }).click();
  await page.getByRole("button", { name: "+ Tambah request", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Judul", { exact: true }).fill("Audit request");
  await page.getByRole("dialog").getByRole("button", { name: "Simpan", exact: true }).click();
  await page.getByRole("button", { name: "Jadikan to-do", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Konversi ke To-do" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Simpan", exact: true }).click();
  await page.getByRole("button", { name: "Lihat hasil konversi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Audit request", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/section=todos&detail=/);

  await page.getByRole("link", { name: "Masuk / Buat akun" }).click();
  await expect(page.getByRole("heading", { name: "Masuk ke ruang kerja" })).toBeVisible();
  await expect(page.getByText("Login akun belum aktif")).toBeVisible();
  await page.getByRole("link", { name: "Buat akun", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Buat akun baru" })).toBeVisible();
  await page.getByRole("link", { name: "Buka ruang kerja lokal" }).click();
  await expect(page.getByRole("heading", { name: "Hari ini", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("restores every detail with browser Back and Forward", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({
      projects: [{ id: "p1", title: "Proyek detail", status: "Direncanakan" }],
      todos: [{ id: "t1", title: "Tugas detail", status: "Belum Mulai", projectId: "p1" }],
      requests: [{ id: "r1", title: "Request detail", status: "Baru" }],
      notes: [{ id: "n1", title: "Catatan detail", content: "Isi tersimpan", updatedAt: Date.now() }],
    }));
  });
  await page.goto("/workspace");
  const nav = page.getByRole("navigation", { name: "Menu utama" });
  const sections = [
    { menu: "Proyek", section: "projects", id: "p1", trigger: "Proyek detail", title: "Proyek detail", list: "Proyek saya" },
    { menu: "To-do", section: "todos", id: "t1", trigger: "Tugas detail", title: "Tugas detail", list: "To-do saya" },
    { menu: "Request", section: "requests", id: "r1", trigger: "Request detail", title: "Request detail", list: "Daftar request" },
    { menu: "Notes", section: "notes", id: "n1", trigger: "Buka catatan Catatan detail", title: "Catatan detail", list: "Notes" },
  ];

  for (const section of sections) {
    await nav.getByRole("button", { name: section.menu, exact: true }).click();
    await page.locator("main").getByRole("button", { name: section.trigger, exact: true }).click();
    const detailUrl = `/workspace?section=${section.section}&detail=${section.id}`;
    await expect(page).toHaveURL(detailUrl);
    await expect(page.getByRole("heading", { name: section.title, exact: true })).toBeVisible();
    if (section.section === "notes") await page.getByLabel("Isi catatan").fill("Draf dari detail");

    await page.goBack();
    await expect(page.getByRole("heading", { name: section.list, exact: true })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(detailUrl);
    await expect(page.getByRole("heading", { name: section.title, exact: true })).toBeVisible();
    if (section.section === "notes") await expect(page.getByLabel("Isi catatan")).toHaveValue("Draf dari detail");
  }

  await page.goto("/workspace?section=requests&detail=r1");
  await expect(page.getByRole("heading", { name: "Request detail", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Kembali ke request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Daftar request", exact: true })).toBeVisible();
});

test("project cards are clickable anywhere with shadow separation and structured detail", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("ruang-theme", "light");
    localStorage.setItem("ruang-proyek-local-v1", JSON.stringify({
      projects: [
        {
          id: "p1",
          title: "Proyek Alpha",
          description: "Deskripsi proyek alpha yang bisa diklik di mana saja.",
          status: "Dikerjakan",
          date: "2026-12-01",
          folder: "D:\\Projects\\Alpha",
          links: [{ label: "Repo GitHub", url: "https://github.com/example/alpha" }],
          updatedAt: Date.now() - 5000,
        },
        {
          id: "p2",
          title: "Proyek Beta",
          description: "Deskripsi proyek beta kedua.",
          status: "Direncanakan",
          updatedAt: Date.now() - 10000,
        },
      ],
      todos: [
        { id: "t1", title: "Tugas selesai", status: "Selesai", projectId: "p1", position: 1000 },
        { id: "t2", title: "Tugas berjalan", status: "Dikerjakan", projectId: "p1", position: 2000 },
      ],
      requests: [],
      notes: [],
    }));
  });
  await page.goto("/workspace?section=projects");

  const region = page.getByRole("region", { name: "Proyek" });
  const cards = region.locator(".project-card");
  await expect(cards).toHaveCount(2);

  const shadow = await cards.first().evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).not.toBe("none");

  const box1 = await cards.nth(0).boundingBox();
  const box2 = await cards.nth(1).boundingBox();
  expect(box2!.y).toBeGreaterThan(box1!.y + box1!.height);

  await expect(cards.first()).toContainText("1/2 To-do selesai (50%)");
  await page.screenshot({ path: testInfo.outputPath("projects-list-light.png"), fullPage: true });

  // Clicking at the card description coordinates (not the title) still opens the project detail.
  const descBox = await page.getByText("Deskripsi proyek alpha yang bisa diklik di mana saja.").boundingBox();
  expect(descBox).not.toBeNull();
  await page.mouse.click(descBox!.x + descBox!.width / 2, descBox!.y + descBox!.height / 2);
  await expect(page.getByRole("heading", { name: "Proyek Alpha", exact: true })).toBeVisible();
  await expect(page.locator(".detail-progress-label")).toHaveText("50% (1/2)");
  await expect(page.getByText("D:\\Projects\\Alpha")).toBeVisible();
  await expect(page.getByRole("link", { name: /Repo GitHub/ })).toBeVisible();

  await page.getByRole("button", { name: "Tambah tugas", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Tambah To-do" });
  await expect(dialog.getByRole("combobox", { name: "Proyek tugas" })).toContainText("Proyek Alpha");
  await dialog.getByLabel("Judul", { exact: true }).fill("Tugas baru dari detail");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.locator(".detail-progress-label")).toHaveText("33% (1/3)");
  await page.screenshot({ path: testInfo.outputPath("project-detail-light.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Kembali ke proyek", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Kanban keeps columns in status order and moves cards without status dropdowns", async ({ page }, testInfo) => {
  await openWorkspace(page, "dark");
  await page.getByRole("navigation", { name: "Menu utama" })
    .getByRole("button", { name: "To-do", exact: true }).click();
  await expect(page.getByRole("heading", { name: "To-do saya", exact: true })).toBeVisible();

  const columns = page.locator(".todo-board > .todo-column");
  await expect(columns).toHaveCount(4);
  await expect(columns.nth(0)).toHaveAttribute("aria-label", "Kolom Belum Mulai");
  await expect(columns.nth(1)).toHaveAttribute("aria-label", "Kolom Dikerjakan");
  await expect(columns.nth(2)).toHaveAttribute("aria-label", "Kolom On Review");
  await expect(columns.nth(3)).toHaveAttribute("aria-label", "Kolom Selesai");

  await expect(columns.getByRole("combobox")).toHaveCount(0);
  const handle = page.getByRole("button", { name: "Geser Tugas antrean" });
  const progressColumn = columns.nth(1);
  const sourceHandle = (await handle.boundingBox())!;
  const targetCard = (await progressColumn.getByRole("article").boundingBox())!;
  const startX = sourceHandle.x + sourceHandle.width / 2;
  const startY = sourceHandle.y + sourceHandle.height / 2;
  const targetX = targetCard.x + targetCard.width - sourceHandle.width;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, startY, { steps: 12 });
  const taskTitles = page.getByText("Tugas antrean", { exact: true });
  const pointOverTarget = { x: targetCard.x + targetCard.width / 2, y: startY };
  await expect.poll(() => taskTitles.evaluateAll(
    (titles, point) => titles.some((title) => {
      const card = title.closest(".todo-card");
      if (!card?.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
      const bounds = card.getBoundingClientRect();
      return bounds.left <= point.x && point.x < bounds.right &&
        bounds.top <= point.y && point.y < bounds.bottom;
    }),
    pointOverTarget,
  )).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("todo-kanban-drag.png"), fullPage: true });
  await page.mouse.up();
  await expect(progressColumn.getByRole("button", { name: "Tugas antrean", exact: true })).toBeVisible();
  await expect(taskTitles).toHaveCount(1);
  await expect(page.locator(".workspace-toast")).toHaveText(/Perubahan tersimpan/);

  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect(columns.nth(0).getByRole("button", { name: "Tugas antrean", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("todo-kanban.png"), fullPage: true });

  // Verify Select inside modal dialog also renders unclipped and handles Escape without closing modal.
  await page.getByRole("button", { name: "+ Tambah tugas", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Tambah To-do" });
  await dialog.getByRole("combobox", { name: "Status", exact: true }).click();
  const modalListbox = dialog.getByRole("listbox");
  await expect(modalListbox).toBeVisible();
  const modalOptionBox = await modalListbox.getByRole("option", { name: "Selesai", exact: true }).boundingBox();
  expect(modalOptionBox!.height).toBeGreaterThanOrEqual(40);
  await page.keyboard.press("Escape");
  await expect(modalListbox).not.toBeVisible();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
