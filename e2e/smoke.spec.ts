import { readFileSync } from 'node:fs';
import { expect, test, type ConsoleMessage } from '@playwright/test';
import { prerenderPaths } from '../scripts/lib/paths';

const PATHS = prerenderPaths().filter((p) => p !== '/404' && p !== '/styleguide');

test.describe('every prerendered route', () => {
  for (const path of PATHS) {
    test(`renders ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page).toHaveTitle(/Tech Pravaha/);
    });
  }
});

test('websites page shows the Launch price from the catalogue', async ({ page }) => {
  // Read with fs: Playwright's loader cannot import JSON without an import attribute.
  const catalogue = JSON.parse(readFileSync('catalogue.json', 'utf8'));
  const launch: number = catalogue.services.find((s: { id: string }) => s.id === 'websites').tiers[0].price;
  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  await page.goto('/services/websites');
  await expect(page.getByText(inr.format(launch)).first()).toBeVisible();
});

test('header WhatsApp control points at wa.me or /contact', async ({ page }) => {
  await page.goto('/');
  const control = page.locator('header').getByRole('link', { name: /WhatsApp/ });
  await expect(control).toBeVisible();
  await expect(control).toHaveAttribute('href', /wa\.me|\/contact/);
});

test.describe('theme', () => {
  // Playwright defaults to a light OS scheme, which the site honours on first visit.
  test.use({ colorScheme: 'dark' });

  test('toggle switches to light and persists after reload', async ({ page }) => {
    await page.goto('/');
    // Wait for hydration, or the click lands on server-rendered markup with no handler yet.
    await page.waitForLoadState('networkidle');
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/light/);
    await page.locator('header').getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(html).toHaveClass(/light/);
    await page.reload();
    await expect(html).toHaveClass(/light/);
  });
});

test('header navigation is client-side (no full reload)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    (window as unknown as { __marker: number }).__marker = 1;
  });
  await page.locator('header nav').getByRole('link', { name: 'Services' }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.locator('h1').first()).toBeVisible();
  const marker = await page.evaluate(() => (window as unknown as { __marker?: number }).__marker);
  expect(marker).toBe(1);
});

test('a lab app is served as a static file', async ({ request }) => {
  const res = await request.get('/lab/play/meeting-meter/');
  expect(res.status()).toBe(200);
});

test('sitemap.xml and rss.xml are served', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain('<urlset');
  // Cloudflare Pages serves dir/index.html at /x/ and 308s /x, so every loc ends with a slash.
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(20);
  for (const loc of locs) expect(loc).toMatch(/\/$/);
  const rss = await request.get('/rss.xml');
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain('<rss');
});

test('an unknown URL shows the 404 page and hydrates without errors', async ({ page }) => {
  // `serve` falls back to 404.html (status 404 or 200 depending on the host); assert the content.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/does-not-exist');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: 'That page did not ship.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('canonical uses the trailing-slash URL', async ({ page }) => {
  await page.goto('/services/websites/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://techpravaha.com/services/websites/',
  );
});

for (const width of [1440, 375]) {
  test(`home has no console errors at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('console', (m: ConsoleMessage) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}
