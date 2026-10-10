import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogue } from '../app/lib/catalogue';
import { SITE_NAME } from '../app/lib/site';
import { SERVICES } from '../app/content/services';
import { WORK } from '../app/content/work';
import { LAB } from '../app/content/lab';
import { TESTIMONIALS } from '../app/content/testimonials';
import { findSuperlatives } from '../scripts/lib/voice';
import { HOSTED_APP_SLUGS } from '../scripts/lib/paths';

const PUBLIC = join(process.cwd(), 'public');
const serviceIds = catalogue.services.map((s) => s.id);
const workSlugs = WORK.map((w) => w.slug);

const H1: Record<string, string> = {
  websites: 'A website that looks like you meant it.',
  apps: 'An app your customers actually open.',
  ai: 'An AI front door that answers at 2am.',
  whatsapp: 'WhatsApp that sells while you sleep.',
  content: 'Content that ships every week without you.',
  design: 'Design that makes the product obvious.',
};

describe('SERVICES', () => {
  it('has an entry for every catalogue service, and nothing else', () => {
    expect(Object.keys(SERVICES).sort()).toEqual([...serviceIds].sort());
    for (const id of serviceIds) expect(SERVICES[id].id).toBe(id);
  });

  it('uses the agreed H1 for each service', () => {
    for (const id of serviceIds) expect(SERVICES[id].h1).toBe(H1[id]);
  });

  it('has the four facts in order, with payment terms taken from the catalogue', () => {
    for (const s of catalogue.services) {
      const facts = SERVICES[s.id].facts;
      expect(facts.map((f) => f.label)).toEqual(['Timeline', 'Stack', 'Includes', 'Payment']);
      for (const f of facts) expect(f.value.length).toBeGreaterThan(0);
      const payment = facts[3].value.toLowerCase();
      for (const t of s.tiers) {
        if (t.payment) expect(payment).toContain(t.payment.toLowerCase());
      }
      const timeline = facts[0].value;
      for (const t of s.tiers) {
        if (t.weeks) expect(timeline).toContain(`${t.weeks} week`);
        if (t.days) expect(timeline).toContain(`${t.days} day`);
      }
    }
  });

  it('has four numbered after-pay steps', () => {
    for (const id of serviceIds) {
      const steps = SERVICES[id].afterPay;
      expect(steps.map((s) => s.n)).toEqual(['01', '02', '03', '04']);
      for (const s of steps) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('has 5 to 7 FAQs, each answered', () => {
    for (const id of serviceIds) {
      const faq = SERVICES[id].faq;
      expect(faq.length).toBeGreaterThanOrEqual(5);
      expect(faq.length).toBeLessThanOrEqual(7);
      for (const f of faq) {
        expect(f.q.endsWith('?')).toBe(true);
        expect(f.a.length).toBeGreaterThan(20);
      }
    }
  });

  it('every FAQ set covers GST at 18%', () => {
    for (const id of serviceIds) {
      const text = SERVICES[id].faq.map((f) => f.a).join(' ');
      expect(text).toContain('18% GST');
    }
  });

  it('states payment and timeline FAQs that match the catalogue tiers', () => {
    for (const s of catalogue.services) {
      const faq = SERVICES[s.id].faq;
      const pay = faq.find((f) => f.q.startsWith('How does payment work'));
      const time = faq.find((f) => f.q === 'When does the timeline start?');
      expect(pay, `${s.id} payment FAQ`).toBeDefined();
      expect(time, `${s.id} timeline FAQ`).toBeDefined();
      for (const t of s.tiers) {
        if (t.payment === 'Full payment at checkout') {
          expect(pay!.a).toContain(`${t.label} is paid in full at checkout`);
        } else if (t.payment === '50% at checkout, 50% at launch') {
          expect(pay!.a).toContain(`${t.label} is 50% at checkout and 50% at launch`);
        } else if (t.payment) {
          throw new Error(`unhandled payment wording on ${t.id}: ${t.payment}`);
        }
        if (t.weeks) expect(time!.a).toContain(`${t.label} takes ${t.weeks} week`);
        if (t.days) expect(time!.a).toContain(`${t.label} takes ${t.days} day`);
      }
    }
  });

  it('links related work that exists', () => {
    for (const id of serviceIds) {
      for (const slug of SERVICES[id].related) expect(workSlugs).toContain(slug);
    }
  });

  it('keeps meta within search limits and names the service market', () => {
    for (const id of serviceIds) {
      const { metaTitle, metaDescription } = SERVICES[id];
      expect(metaTitle.length).toBeLessThanOrEqual(60);
      // pageMeta() appends " | Tech Pravaha"; the rendered title should fit too.
      expect(`${metaTitle} | ${SITE_NAME}`.length).toBeLessThanOrEqual(60);
      expect(metaDescription.length).toBeLessThanOrEqual(155);
      expect(metaTitle).toMatch(/India/);
      expect(metaDescription).toMatch(/India/);
    }
  });
});

describe('WORK', () => {
  it('lists the four cleared items with unique slugs', () => {
    expect(workSlugs).toEqual(['exhibition-app', 'qui-ambassador-app', 'home-manager', 'intpro']);
    expect(new Set(workSlugs).size).toBe(workSlugs.length);
  });

  it('features exactly the three agreed items', () => {
    expect(WORK.filter((w) => w.featured).map((w) => w.slug)).toEqual([
      'exhibition-app',
      'qui-ambassador-app',
      'intpro',
    ]);
  });

  it('tags work with real catalogue service ids', () => {
    for (const w of WORK) {
      expect(w.services.length).toBeGreaterThan(0);
      for (const s of w.services) expect(serviceIds).toContain(s);
    }
  });

  it('has a file in public/ for every image', () => {
    for (const w of WORK) {
      expect(w.images.length).toBeGreaterThanOrEqual(2);
      for (const src of w.images) {
        expect(src.startsWith(`/work/${w.slug}/`)).toBe(true);
        expect(existsSync(join(PUBLIC, src))).toBe(true);
      }
    }
  });

  it('has the fields a case study needs', () => {
    for (const w of WORK) {
      expect(w.track).toBe('launched');
      expect(['live', 'in-progress']).toContain(w.status);
      expect(w.oneLiner.length).toBeGreaterThan(0);
      expect(w.problem.length).toBeGreaterThan(0);
      expect(w.shipped.length).toBeGreaterThan(0);
      expect(w.stack.length).toBeGreaterThan(0);
      expect(w.timeline.length).toBeGreaterThan(0);
    }
  });
});

const BLOCKED_API_HOSTS = ['api.anthropic.com', 'api.openai.com', 'generativelanguage.googleapis.com'];
const FETCH_ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
/** Extra literal fetch hosts per hosted app: GoodFind queries the CPSC recall search and loads OCR files from jsDelivr. */
const HOSTED_FETCH_EXTRA_HOSTS: Record<string, string[]> = { goodfind: ['saferproducts.gov', 'cdn.jsdelivr.net'] };
/** Lab apps that use a model, through the Worker's /lab/complete proxy only. */
const PROXIED_LAB_APPS = ['landlord-translator', 'excuse-engine', 'split-the-awkward'];
/** The only non-literal fetch targets a lab app may use: the proxy path, alone or after the tp-api meta host. */
const PROXY_FETCH_RE = /^(?:API_URL\s*\+\s*)?["'`]\/lab\/complete["'`]$/;

/** Every .html and .js file under `dir`, recursively. */
function labScripts(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return labScripts(p);
    return /\.(html|js)$/.test(e.name) ? [p] : [];
  });
}

describe('LAB', () => {
  it('has unique slugs', () => {
    const slugs = LAB.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('serves every playable item from public/lab/play/<slug>/ (hosted products from public/<slug>/ only)', () => {
    const play = LAB.filter((l) => l.kind === 'play');
    expect(play.length).toBeGreaterThanOrEqual(3);
    for (const l of play) {
      // A hosted product lives only at its root path; there is no lab copy.
      const hosted = (HOSTED_APP_SLUGS as readonly string[]).includes(l.slug);
      expect(existsSync(join(PUBLIC, ...(hosted ? [l.slug] : ['lab', 'play', l.slug]), 'index.html'))).toBe(true);
      expect(existsSync(join(PUBLIC, 'lab', 'play', l.slug))).toBe(!hosted);
      expect(l.href).toBe(hosted ? `/${l.slug}/` : `/lab/play/${l.slug}/`);
    }
  });

  it('redirects the old lab URL of Plot Twist to /plot-twist/', () => {
    const redirects = readFileSync(join(PUBLIC, '_redirects'), 'utf8');
    expect(redirects).toContain('/lab/play/plot-twist/* /plot-twist/:splat 301');
  });

  it('links every hosted product to /<slug>/, built into public/<slug>/index.html', () => {
    for (const slug of HOSTED_APP_SLUGS) {
      const item = LAB.find((l) => l.slug === slug);
      expect(item, slug).toBeDefined();
      expect(item!.href).toBe(`/${slug}/`);
      const html = readFileSync(join(PUBLIC, slug, 'index.html'), 'utf8');
      expect(html, slug).toMatch(/<title>[^<]+<\/title>/);
      expect(html, slug).toMatch(/<meta\s+name="description"\s+content="[^"]+"/);
      expect(html, slug).toContain(`base path /${slug}/. Generated by scripts/apps/build-apps.ts`);
    }
  });

  it('keeps hosted products off AI API hosts, with root URLs inside their own path', () => {
    for (const slug of HOSTED_APP_SLUGS) {
      const dir = join(PUBLIC, slug);
      const files = readdirSync(dir, { recursive: true })
        .map(String)
        .filter((f) => /\.(html|js|webmanifest)$/.test(f));
      expect(files.length, slug).toBeGreaterThan(0);
      for (const f of files) {
        const text = readFileSync(join(dir, f), 'utf8');
        for (const host of BLOCKED_API_HOSTS) expect(text, `${slug}/${f} calls ${host}`).not.toContain(host);
        // Literal fetches to another host: Google Fonts for every app, plus the named hosts for GoodFind only.
        const allowed = [...FETCH_ALLOWED_HOSTS, ...(HOSTED_FETCH_EXTRA_HOSTS[slug] ?? [])];
        for (const m of text.matchAll(/fetch\(\s*[`'"]https?:\/\/([^/`'"\s]+)/g)) {
          expect(allowed, `${slug}/${f} fetches ${m[1]}`).toContain(m[1]);
        }
      }
      // Asset links in index.html are relative or under /<slug>/, never at the site root.
      const html = readFileSync(join(dir, 'index.html'), 'utf8');
      for (const m of html.matchAll(/\s(?:src|href)="(\/[^"]*)"/g)) expect(m[1], slug).toMatch(new RegExp(`^/${slug}/`));
    }
  });

  it('scopes every hosted service worker to its own path', () => {
    const homefind = readFileSync(join(PUBLIC, 'homefind', 'registerSW.js'), 'utf8');
    expect(homefind).toContain(`register('/homefind/sw.js', { scope: '/homefind/' })`);
    const goodfind = readdirSync(join(PUBLIC, 'goodfind', 'assets'))
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(join(PUBLIC, 'goodfind', 'assets', f), 'utf8'))
      .join('\n');
    expect(goodfind).toContain('register("/goodfind/sw.js",{scope:"/goodfind/"})');
    expect(goodfind).not.toContain('register("/sw.js")');
    const sw = readFileSync(join(PUBLIC, 'goodfind', 'sw.js'), 'utf8');
    expect(sw).not.toMatch(/['"]\/(?!goodfind\/)[^'"]*['"]/);
    expect(sw).toContain("key.startsWith('goodfind-')");
    const manifest = JSON.parse(readFileSync(join(PUBLIC, 'goodfind', 'manifest.webmanifest'), 'utf8'));
    expect(manifest.start_url).toBe('/goodfind/');
    expect(manifest.scope).toBe('/goodfind/');
  });

  it('never calls a third-party API from the browser; model calls go through /lab/complete', () => {
    const files = labScripts(join(PUBLIC, 'lab', 'play'));
    expect(files.some((f) => f.endsWith('.html'))).toBe(true);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const host of BLOCKED_API_HOSTS) expect(text, `${file} calls ${host}`).not.toContain(host);
      for (const m of text.matchAll(/fetch\(\s*[`'"]https?:\/\/([^/`'"\s]+)/g)) {
        expect(FETCH_ALLOWED_HOSTS, `${file} fetches ${m[1]}`).toContain(m[1]);
      }
      // Any fetch target that is not an absolute literal must be the proxy path (relative, or after the tp-api host).
      for (const m of text.matchAll(/fetch\(\s*([^,)]+?)\s*[,)]/g)) {
        if (/^[`'"]https?:\/\//.test(m[1]!)) continue;
        expect(m[1], `${file} fetches ${m[1]}`).toMatch(PROXY_FETCH_RE);
      }
      // API_URL may only come from the tp-api meta tag.
      for (const m of text.matchAll(/API_URL\s*=\s*([^;\n]+)/g)) {
        expect(m[1], `${file} sets API_URL`).toMatch(/^\(document\.querySelector\('meta\[name="tp-api"\]'\)\|\|\{\}\)\.content \|\| ""$/);
      }
    }
  });

  it('routes the three model apps through the Worker proxy, with the API host in a tp-api meta tag', () => {
    for (const slug of PROXIED_LAB_APPS) {
      const text = readFileSync(join(PUBLIC, 'lab', 'play', slug, 'index.html'), 'utf8');
      expect(text, slug).toContain('/lab/complete');
      expect(text, slug).not.toContain('api.anthropic.com');
      expect(text, slug).toContain('<meta name="tp-api" content="https://api.techpravaha.com">');
      expect(text, slug).toContain('Only change: model calls go through the Tech Pravaha Worker (/lab/complete); no other edits.');
      expect(text, slug).toContain(`app:"${slug}"`);
    }
    expect(LAB.filter((l) => l.kind === 'play').map((l) => l.slug)).toEqual(expect.arrayContaining(PROXIED_LAB_APPS));
  });

  it('lists exactly the apps on disk', () => {
    const onDisk = readdirSync(join(PUBLIC, 'lab', 'play')).sort();
    const hosted = HOSTED_APP_SLUGS as readonly string[];
    const listed = LAB.filter((l) => l.kind === 'play' && !hosted.includes(l.slug)).map((l) => l.slug).sort();
    expect(onDisk).toEqual(listed);
  });

  it('leaves extension and web app cards unlinked until a store link or hosted build exists', () => {
    const hosted = HOSTED_APP_SLUGS as readonly string[];
    for (const l of LAB.filter((x) => x.kind !== 'play')) expect(l.href).toBe(hosted.includes(l.slug) ? `/${l.slug}/` : '#');
    expect(LAB.filter((l) => l.kind === 'extension').every((l) => l.href === '#')).toBe(true);
  });

  it('gives every item a one-sentence blurb', () => {
    for (const l of LAB) {
      expect(l.blurb.length).toBeGreaterThan(0);
      expect(l.blurb.length).toBeLessThanOrEqual(160);
      expect(l.blurb).toMatch(/[.?]$/);
    }
  });
});

describe('copy rules', () => {
  const all = JSON.stringify({ SERVICES, WORK, LAB, TESTIMONIALS });
  const svgs = WORK.flatMap((w) => w.images)
    .filter((src) => src.endsWith('.svg'))
    .map((src) => ({ src, text: readFileSync(join(PUBLIC, src), 'utf8') }));

  it('has no em-dash anywhere in services, work, lab or testimonials copy', () => {
    expect(all).not.toMatch(/—/);
  });

  it('has no em-dash in the placeholder SVGs', () => {
    expect(svgs.length).toBeGreaterThan(0);
    for (const { src, text } of svgs) expect(text, src).not.toMatch(/—/);
  });

  it('has no superlatives', () => {
    expect(findSuperlatives(all)).toEqual([]);
  });
});

describe('TESTIMONIALS', () => {
  it('ships empty until real client words are supplied', () => {
    expect(Array.isArray(TESTIMONIALS)).toBe(true);
    expect(TESTIMONIALS).toHaveLength(0);
  });
});
