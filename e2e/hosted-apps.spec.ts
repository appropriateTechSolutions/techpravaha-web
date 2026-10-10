import { expect, test } from '@playwright/test';

/** Hosted products in public/<slug>/ (see scripts/apps/build-apps.ts), with a title fragment each. */
const APPS = [
  { path: '/homefind/', title: /HomeFind/, sw: '/homefind/sw.js' },
  { path: '/goodfind/', title: /GoodFind/, sw: '/goodfind/sw.js' },
  { path: '/plot-twist/', title: /Plot Twist/, sw: null },
] as const;

for (const app of APPS) {
  test(`${app.path} serves the app with its own title, no errors and no missing assets`, async ({ page }) => {
    const errors: string[] = [];
    const missing: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('response', (r) => r.status() >= 400 && missing.push(`${r.status()} ${r.url()}`));

    const res = await page.goto(app.path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(app.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    await page.waitForLoadState('networkidle');
    // The app rendered something into the page body (React root or the static markup).
    await expect(page.locator('body')).not.toBeEmpty();
    expect(await page.locator('body').innerText()).not.toHaveLength(0);
    expect(missing).toEqual([]);
    expect(errors).toEqual([]);
  });

  if (app.sw) {
    test(`${app.path} registers its service worker at ${app.sw}, scoped to ${app.path}`, async ({ page, request }) => {
      const sw = await request.get(app.sw);
      expect(sw.status()).toBe(200);
      expect(sw.headers()['content-type']).toMatch(/javascript/);

      await page.goto(app.path);
      const scopes = await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.map((r) => new URL(r.scope).pathname);
      });
      expect(scopes).toEqual([app.path]);
    });
  }
}

for (const app of APPS.filter((a) => a.sw)) {
  test(`the ${app.path} service worker does not control the main site`, async ({ page }) => {
    await page.goto(app.path);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.goto('/');
    expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
  });
}

test('LabCard: an unlinked extension says "source on request"; the unlinked AfterBuy web app does not', async ({ page }) => {
  await page.goto('/lab/');
  const extension = page.locator('article', { has: page.getByRole('heading', { name: 'Tab Tamer' }) });
  await expect(extension).toContainText('source on request');
  const pwa = page.locator('article', { has: page.getByRole('heading', { name: 'AfterBuy' }) });
  await expect(pwa).toHaveCount(1);
  await expect(pwa).not.toContainText('source on request');
});

test('sitemap lists the hosted products', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  for (const app of APPS) expect(xml).toContain(`<loc>https://techpravaha.com${app.path}</loc>`);
});
