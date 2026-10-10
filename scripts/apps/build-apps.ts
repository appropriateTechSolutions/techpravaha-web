/**
 * Rebuilds the hosted products from their own repos and copies them into public/<slug>/:
 *   npm run apps:build               all apps
 *   npm run apps:build -- homefind   one app (slugs from HOSTED_APP_SLUGS)
 * Output is committed. To update an app: edit its repo, run this, commit here.
 *
 * Source repos are read-only. Vite builds write to a temp directory (`--outDir`), never to the
 * source repo's dist/. The only files a build touches inside a source repo are tsc build-info
 * caches under its node_modules/ (git-ignored). HomeFind's `npm run icons` step is skipped on
 * purpose: it rewrites the PNGs committed in its public/, and those are already up to date.
 *
 * Every patch below exists because the source hardcodes a root path that `--base` cannot reach.
 * Each one asserts how many times its target occurs, so a source change fails the build loudly
 * instead of shipping a half-patched app. Running the script twice gives the same files (the
 * header comment carries the build date, so a run on another day changes only that line).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { HOSTED_APP_SLUGS, type HostedAppSlug } from '../lib/paths';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const HOME = homedir();

/** Hosts a hosted app must never call from the browser (AI APIs need a key; keys never ship). */
const BLOCKED_API_HOSTS = ['api.anthropic.com', 'api.openai.com', 'generativelanguage.googleapis.com'];

interface AppSpec {
  slug: HostedAppSlug;
  name: string;
  /** Absolute path to the source repo. */
  source: string;
  /** `vite`: typecheck then `vite build --base=/<slug>/`. `static`: copy the folder as-is. */
  kind: 'vite' | 'static';
  /** For `static` apps: top-level entries not to publish. */
  exclude?: string[];
  /** Post-build fixes for root paths the base flag does not rewrite. */
  patch?: (dir: string, base: string) => void;
  /** Used only if the source index.html lacks them. */
  fallbackTitle: string;
  fallbackDescription: string;
}

/** Thrown by `fail`; caught once at the top level (exit code 1) so `build`'s temp-dir cleanup always runs. */
class BuildError extends Error {}

function fail(message: string): never {
  throw new BuildError(message);
}

function run(cmd: string, args: string[], cwd: string): void {
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
}

function git(cwd: string, args: string[]): string {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: false })
    .map(String)
    .filter((f) => statSync(join(dir, f)).isFile())
    .sort();
}

/** Replaces `from` with `to` in a file, failing unless `from` occurs exactly `count` times. */
function replaceExact(file: string, from: string, to: string, count: number, why: string): void {
  const text = readFileSync(file, 'utf8');
  const found = text.split(from).length - 1;
  if (found !== count) fail(`${file}: expected ${count} x ${JSON.stringify(from)} (${why}), found ${found}`);
  writeFileSync(file, text.split(from).join(to));
}

/**
 * GoodFind ships a hand-written service worker and registers it from main.tsx with
 * `register('/sw.js')`, and its manifest uses root paths. Vite rewrites only the asset URLs
 * in index.html, so these are patched here.
 */
function patchGoodFind(dir: string, base: string): void {
  // 1. Registration: the bundle registers /sw.js (would 404 on the main site, or worse, take
  //    scope `/`). Point it at the subpath copy with an explicit subpath scope.
  const entry = files(join(dir, 'assets'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => join(dir, 'assets', f))
    .filter((f) => readFileSync(f, 'utf8').includes('serviceWorker.register('));
  if (entry.length !== 1) fail(`goodfind: expected one bundle that registers the service worker, found ${entry.length}`);
  replaceExact(entry[0]!, 'register("/sw.js")', `register("${base}sw.js",{scope:"${base}"})`, 1, 'SW registration');

  // 2. Service worker shell paths: '/' (the app index), the manifest and the icon.
  const sw = join(dir, 'sw.js');
  replaceExact(sw, "'/manifest.webmanifest'", `'${base}manifest.webmanifest'`, 1, 'SW shell: manifest');
  replaceExact(sw, "'/icons/goodfind-mark.svg'", `'${base}icons/goodfind-mark.svg'`, 1, 'SW shell: icon');
  replaceExact(sw, "fetch('/',", `fetch('${base}',`, 1, 'SW precache: index fetch');
  replaceExact(sw, "putResponse(cache, '/',", `putResponse(cache, '${base}',`, 1, 'SW precache: index put');
  replaceExact(sw, "cacheResponse('/',", `cacheResponse('${base}',`, 1, 'SW navigate: index refresh');
  replaceExact(sw, "caches.match('/')", `caches.match('${base}')`, 1, 'SW navigate: offline index');
  // 3. Its activate step deletes every Cache Storage entry except its own. On a shared origin
  //    that would wipe HomeFind's Workbox precache, so limit the cleanup to GoodFind's caches.
  replaceExact(
    sw,
    'keys.filter((key) => key !== CACHE_NAME)',
    "keys.filter((key) => key.startsWith('goodfind-') && key !== CACHE_NAME)",
    1,
    'SW activate: only delete goodfind caches',
  );

  // 4. Manifest: start_url, scope, icon and shortcut URLs are root-absolute.
  const manifestPath = join(dir, 'manifest.webmanifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  const rebase = (p: string) => (p.startsWith('/') && !p.startsWith(base) ? base + p.slice(1) : p);
  const rebaseIcons = (icons: unknown) =>
    Array.isArray(icons) ? icons.map((i: { src: string }) => ({ ...i, src: rebase(i.src) })) : icons;
  manifest.start_url = rebase(String(manifest.start_url));
  manifest.scope = rebase(String(manifest.scope));
  manifest.icons = rebaseIcons(manifest.icons);
  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map((s: { url: string; icons?: unknown }) => ({
      ...s,
      url: rebase(s.url),
      ...(s.icons ? { icons: rebaseIcons(s.icons) } : {}),
    }));
  }
  if (manifest.start_url !== base || manifest.scope !== base) fail('goodfind: manifest start_url/scope not rebased');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  // 5. Its vite config emits source maps. They are not needed to run the app; drop them so the
  //    site does not publish the app's source tree.
  for (const f of files(dir)) {
    const full = join(dir, f);
    if (f.endsWith('.map')) unlinkSync(full);
    else if (/\.(js|css)$/.test(f)) {
      const text = readFileSync(full, 'utf8');
      const out = text.replace(/\n?\/[/*][#@] sourceMappingURL=\S+?(?: \*\/)?$/gm, '');
      if (out !== text) writeFileSync(full, out);
    }
  }
}

/** HomeFind (vite-plugin-pwa) needs no patch: the checks below prove the base flag was enough. */
function checkHomeFind(dir: string, base: string): void {
  const reg = readFileSync(join(dir, 'registerSW.js'), 'utf8');
  if (!reg.includes(`register('${base}sw.js', { scope: '${base}' })`)) fail(`homefind: registerSW.js does not register ${base}sw.js with scope ${base}`);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8')) as { start_url: string; scope: string };
  // Relative './' resolves against the manifest URL, i.e. the subpath.
  if (manifest.start_url !== './' || manifest.scope !== './') fail('homefind: manifest start_url/scope are no longer relative');
}

const APPS: AppSpec[] = [
  {
    slug: 'homefind',
    name: 'HomeFind',
    source: join(HOME, 'Documents/ChatGPT/Extensios/homefind'),
    kind: 'vite',
    patch: checkHomeFind,
    fallbackTitle: 'HomeFind',
    fallbackDescription: 'A household inventory for one question: where did we put it?',
  },
  {
    slug: 'goodfind',
    name: 'GoodFind',
    source: join(HOME, 'Documents/ChatGPT/Extensios/goodfind'),
    kind: 'vite',
    patch: patchGoodFind,
    fallbackTitle: 'GoodFind',
    fallbackDescription: 'Check secondhand baby gear labels against official US recall records.',
  },
  {
    slug: 'plot-twist',
    name: 'Plot Twist',
    source: join(HOME, 'Documents/ChatGPT/Fun/plot-twist'),
    kind: 'static',
    // No drafts, no tests, no README (a source-repo doc, not part of the app).
    exclude: ['drafts', 'tests', 'README.md', '.git', '.DS_Store'],
    fallbackTitle: 'Plot Twist',
    fallbackDescription: 'A one-minute daily mystery.',
  },
];

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Adds the provenance comment, and a title or description if the source has none. */
function finishIndex(app: AppSpec, dir: string, base: string, commit: string): void {
  const file = join(dir, 'index.html');
  if (!existsSync(file)) fail(`${app.slug}: build has no index.html`);
  let html = readFileSync(file, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) {
    html = html.replace(/<\/head>/i, `  <title>${escapeAttr(app.fallbackTitle)}</title>\n  </head>`);
  }
  if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html)) {
    html = html.replace(/<\/head>/i, `  <meta name="description" content="${escapeAttr(app.fallbackDescription)}">\n  </head>`);
  }
  const date = new Date().toISOString().slice(0, 10);
  const src = app.source.startsWith(HOME) ? `~${app.source.slice(HOME.length)}` : app.source;
  const comment =
    `<!-- ${app.name}: built from ${src}${commit ? ` (commit ${commit})` : ''} on ${date}, base path ${base}. ` +
    `Generated by scripts/apps/build-apps.ts in techpravaha-web; do not edit here, edit the source repo and run npm run apps:build. -->`;
  if (!/^<!doctype html>/i.test(html)) fail(`${app.slug}: index.html does not start with a doctype`);
  html = html.replace(/^(<!doctype html>)\r?\n?/i, `$1\n${comment}\n`);
  writeFileSync(file, html);
}

/** Fails on root-absolute URLs outside the base in index.html, and on any blocked API host. */
function verify(app: AppSpec, dir: string, base: string): void {
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  for (const m of html.matchAll(/\s(?:src|href)="(\/[^"]*)"/g)) {
    if (!m[1]!.startsWith(base)) fail(`${app.slug}: index.html references ${m[1]} outside ${base}`);
  }
  for (const f of files(dir).filter((x) => /\.(html|js|webmanifest|json)$/.test(x))) {
    const text = readFileSync(join(dir, f), 'utf8');
    for (const host of BLOCKED_API_HOSTS) if (text.includes(host)) fail(`${app.slug}: ${f} references ${host}`);
  }
}

function build(app: AppSpec): void {
  const base = `/${app.slug}/`;
  if (!existsSync(app.source)) fail(`${app.slug}: source repo not found at ${app.source}`);
  const out = mkdtempSync(join(tmpdir(), `tp-apps-${app.slug}-`));
  const head = git(app.source, ['rev-parse', '--short', 'HEAD']);
  // A build from uncommitted source is recorded as such, so the comment never claims a clean commit.
  const commit = head && git(app.source, ['status', '--porcelain', '--', '.']) ? `${head}-dirty` : head;
  console.log(`\napps:build: ${app.name} from ${app.source}${commit ? ` @ ${commit}` : ''}`);

  try {
    if (app.kind === 'vite') {
      if (!existsSync(join(app.source, 'node_modules'))) fail(`${app.slug}: run npm install in ${app.source} first`);
      run('npx', ['tsc', '-b'], app.source);
      run('npx', ['vite', 'build', `--base=${base}`, '--outDir', out, '--emptyOutDir', '--logLevel', 'warn'], app.source);
    } else {
      const skip = new Set(app.exclude ?? []);
      for (const entry of readdirSync(app.source)) {
        if (!skip.has(entry)) cpSync(join(app.source, entry), join(out, entry), { recursive: true });
      }
    }

    app.patch?.(out, base);
    finishIndex(app, out, base, commit);
    verify(app, out, base);

    const dest = join(PUBLIC, app.slug);
    rmSync(dest, { recursive: true, force: true });
    cpSync(out, dest, { recursive: true });
    const list = files(dest);
    const bytes = list.reduce((n, f) => n + statSync(join(dest, f)).size, 0);
    console.log(`apps:build: ${app.slug} -> ${relative(ROOT, dest)}${sep} (${list.length} files, ${(bytes / 1024).toFixed(0)} KB)`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

function main(): void {
  const wanted = process.argv.slice(2);
  for (const w of wanted) if (!(HOSTED_APP_SLUGS as readonly string[]).includes(w)) fail(`unknown app "${w}"; known: ${HOSTED_APP_SLUGS.join(', ')}`);
  const missing = HOSTED_APP_SLUGS.filter((s) => !APPS.some((a) => a.slug === s));
  if (missing.length) fail(`HOSTED_APP_SLUGS has no build spec for ${missing.join(', ')}`);

  for (const app of APPS.filter((a) => wanted.length === 0 || wanted.includes(a.slug))) build(app);
  console.log('\napps:build: done. Review the diff under public/ and commit it.');
}

try {
  main();
} catch (err) {
  console.error(err instanceof BuildError ? `apps:build: ${err.message}` : err);
  process.exit(1);
}
