// In `astro dev`: serve the same files (old post images at /blog/resources/, legacy/ at its old paths),
// so the dev server shows what the build will.
// After the build:
// 1. copy legacy/ (files from the old site that keep their exact URLs) into the output,
// 2. copy _posts/Resources/ (old post images) to /blog/resources/,
// 3. write a redirect page at every old path listed in migration/redirects.yml.
// Fails the build if any of these would overwrite a page of the new site.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRedirects, redirectPage } from '../src/lib/redirects.mjs';

function copyTree(src, dest, logger) {
  let n = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const from = path.join(entry.parentPath, entry.name);
    const to = path.join(dest, path.relative(src, from));
    if (fs.existsSync(to)) throw new Error(`legacy copy would overwrite ${to}`);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    n++;
  }
  logger.info(`copied ${n} files from ${path.basename(src)}/`);
}

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css',
  '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

function devFiles(root, base) {
  const sources = [
    ['/blog/resources/', path.join(root, '_posts', 'Resources')],
    ['/', path.join(root, 'legacy')],
  ];
  return (req, res, next) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return next(); }
    if (base && p.startsWith(base + '/')) p = p.slice(base.length);
    for (const [prefix, dir] of sources) {
      if (!p.startsWith(prefix)) continue;
      const file = path.join(dir, p.slice(prefix.length));
      if (file.startsWith(dir) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
        return;
      }
    }
    next();
  };
}

export default function legacy() {
  let site, base;
  return {
    name: 'legacy-urls',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
        base = config.base.replace(/\/$/, '');
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(devFiles(process.cwd(), base));
      },
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const root = process.cwd();
        copyTree(path.join(root, 'legacy'), out, logger);
        copyTree(path.join(root, '_posts', 'Resources'), path.join(out, 'blog', 'resources'), logger);

        const redirects = loadRedirects(root);
        for (const [from, to] of Object.entries(redirects)) {
          const target = path.join(out, to.split('#')[0], 'index.html');
          if (!fs.existsSync(target)) throw new Error(`redirect target missing: ${from} -> ${to}`);
          const file = from.endsWith('/') ? path.join(out, from, 'index.html') : path.join(out, from);
          if (fs.existsSync(file)) throw new Error(`redirect would overwrite a page: ${from}`);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, redirectPage(base + to, site));
        }
        logger.info(`wrote ${Object.keys(redirects).length} redirect pages`);
      },
    },
  };
}
