import { expect, test } from "@playwright/test";

test.describe("PWA", () => {
  test("serves valid manifest, icons, service worker, and PWA metadata", async ({
    page,
    request,
  }) => {
    const manifestRes = await request.get("/manifest.webmanifest");
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.name).toBe("Ruang Proyek");
    expect(manifest.start_url).toBe("/workspace");
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status()).toBe(200);
      expect(iconRes.headers()["content-type"]).toContain("image/png");
    }

    const appleRes = await request.get("/icons/apple-touch-icon.png");
    expect(appleRes.status()).toBe(200);
    expect(appleRes.headers()["content-type"]).toContain("image/png");

    const swRes = await request.get("/sw.js");
    expect(swRes.status()).toBe(200);
    expect(swRes.headers()["content-type"]).toContain("javascript");
    expect(swRes.headers()["cache-control"]).toContain("no-cache");

    await page.goto("/workspace");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest",
    );
    await expect(
      page.locator('meta[name="mobile-web-app-capable"]'),
    ).toHaveAttribute("content", "yes");
    await expect(
      page.locator('meta[name="apple-mobile-web-app-title"]'),
    ).toHaveAttribute("content", "Ruang Proyek");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/icons/apple-touch-icon.png",
    );
  });
});
