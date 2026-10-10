import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { resolveStaticIndex } from './scripts/lib/dev-static-index';

/** Dev only: serve public/<dir>/index.html at /<dir>/ like Pages does. */
function devStaticIndex(): Plugin {
  return {
    name: 'dev-static-index',
    apply: 'serve',
    configureServer(server) {
      const publicDir = resolve(server.config.publicDir || 'public');
      server.middlewares.use((req, res, next) => {
        if ((req.method !== 'GET' && req.method !== 'HEAD') || !req.url) return next();
        const q = req.url.indexOf('?');
        const pathname = q === -1 ? req.url : req.url.slice(0, q);
        const search = q === -1 ? '' : req.url.slice(q);
        const hit = resolveStaticIndex(pathname, (p) => existsSync(join(publicDir, p)));
        if (!hit) return next();
        if (hit.kind === 'redirect') {
          res.statusCode = 301;
          res.setHeader('Location', hit.to + search);
          res.end();
          return;
        }
        req.url = hit.to + search;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), devStaticIndex()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
