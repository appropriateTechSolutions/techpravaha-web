/**
 * Generates static brand images with Playwright (chromium):
 *   npm run og                 -> public/og/*.png (1200x630)
 *   npm run og -- --favicons   -> public/favicons/*.png
 * Output is committed; rerun only when the brand, a service name or a page title changes.
 * First run on a new machine: `npx playwright install chromium`.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();

interface OgJob {
  name: string;
  title: string;
  eyebrow: string;
}

function ogJobs(): OgJob[] {
  const { services } = JSON.parse(readFileSync(join(ROOT, 'catalogue.json'), 'utf8')) as {
    services: { id: string; name: string }[];
  };
  return [
    { name: 'default', title: 'Beautiful things, shipped.', eyebrow: 'Tech Pravaha' },
    ...services.map((s) => ({ name: `services-${s.id}`, title: s.name, eyebrow: 'Services' })),
    { name: 'pricing', title: 'Packages and prices', eyebrow: 'Pricing' },
    { name: 'work', title: 'Things we have shipped', eyebrow: 'Work' },
    { name: 'lab', title: 'Small apps to play with', eyebrow: 'Lab' },
    { name: 'journal', title: 'Notes from the studio', eyebrow: 'Journal' },
    { name: 'about', title: 'A small studio that ships', eyebrow: 'About' },
    { name: 'contact', title: 'Tell us what to launch', eyebrow: 'Contact' },
  ];
}

const FAVICONS = [
  { file: 'favicon-32.png', size: 32 },
  { file: 'favicon-16.png', size: 16 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-512.png', size: 512 },
];

async function main() {
  const favicons = process.argv.includes('--favicons');
  const browser = await chromium.launch();
  try {
    if (favicons) {
      const dir = join(ROOT, 'public/favicons');
      mkdirSync(dir, { recursive: true });
      const url = pathToFileURL(join(ROOT, 'scripts/favicon-template.html')).href;
      for (const { file, size } of FAVICONS) {
        const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
        await page.goto(url);
        await page.screenshot({ path: join(dir, file) });
        await page.close();
        console.log(`favicons/${file} (${size}px)`);
      }
    } else {
      const dir = join(ROOT, 'public/og');
      mkdirSync(dir, { recursive: true });
      const base = pathToFileURL(join(ROOT, 'scripts/og-template.html')).href;
      const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
      for (const job of ogJobs()) {
        const q = new URLSearchParams({ title: job.title, eyebrow: job.eyebrow, theme: 'dark' });
        await page.goto(`${base}?${q}`);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(dir, `${job.name}.png`) });
        console.log(`og/${job.name}.png`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
