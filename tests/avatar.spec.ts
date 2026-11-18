import { expect, test } from "@playwright/test";

test("saves a cropped profile photo and restores it on mobile", async ({ page }) => {
  await page.goto("/");
  const picker = page.locator("aside").getByLabel("Ganti foto profil");
  await picker.setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("test") });
  await expect(page.locator("aside").getByRole("alert")).toContainText("Pilih JPG");
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 320;
    canvas.getContext("2d")!.fillRect(0, 0, 480, 320);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await picker.setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
  const image = page.locator("aside .avatar img");
  await expect(image).toHaveAttribute("src", /^data:image\/webp;base64,/);
  expect(await image.evaluate((node: HTMLImageElement) => [node.naturalWidth, node.naturalHeight])).toEqual([160, 160]);
  await page.reload();
  await expect(image).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".avatar img")).toBeVisible();
});
