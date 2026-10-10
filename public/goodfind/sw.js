const CACHE_NAME = 'goodfind-shell-v2';
const STATIC_SHELL = ['/goodfind/manifest.webmanifest', '/goodfind/icons/goodfind-mark.svg'];

function assetsFromIndex(html, indexUrl) {
  const urls = new Set();
  const assetPattern = /<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(assetPattern)) {
    const url = new URL(match[1], indexUrl);
    if (url.origin === self.location.origin && /\.(?:js|css)$/.test(url.pathname)) urls.add(url.href);
  }
  return [...urls];
}

async function putResponse(cache, request, response) {
  await cache.put(request, response);
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const indexResponse = await fetch('/goodfind/', { cache: 'reload' });
  if (!indexResponse.ok) throw new Error(`Unable to cache app index (HTTP ${indexResponse.status}).`);

  const indexCopy = indexResponse.clone();
  const indexHtml = await indexResponse.text();
  const assets = assetsFromIndex(indexHtml, indexResponse.url);

  await Promise.all([
    putResponse(cache, '/goodfind/', indexCopy),
    ...STATIC_SHELL.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Unable to cache ${url} (HTTP ${response.status}).`);
      await putResponse(cache, url, response);
    }),
    ...assets.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Unable to cache ${url} (HTTP ${response.status}).`);
      await putResponse(cache, url, response);
    }),
  ]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('goodfind-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function cacheResponse(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await putResponse(cache, request, response);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) await cacheResponse('/goodfind/', response.clone());
          return response;
        } catch {
          return (await caches.match('/goodfind/')) || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cacheResponse(request, response.clone());
      return response;
    })(),
  );
});
