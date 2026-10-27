// Crawls a build from its home page and fails on any internal link or asset that
// doesn't load (following 301s and redirect pages). Run it on both builds:
//   node scripts/check-links.mjs                                 (dist/, root path)
//   node scripts/check-links.mjs dist-preview /website-preview   (preview build)
// Images: every <img> must load (a missing local image fails), and posts must not hotlink
// raw.githubusercontent.com (old post images are served locally). Add --external to also
// request third-party images (needs the network).
// For the preview build it also checks that every page has the noindex meta tag.
import { createServer, listen } from './serve.mjs';

const args = process.argv.slice(2);
const external = args.includes('--external');
const [dir = 'dist', prefix = ''] = args.filter((a) => !a.startsWith('--'));
const server = createServer(dir, prefix);
const origin = `http://127.0.0.1:${await listen(server)}`;
const failures = [];
const seen = new Set();
const queue = [prefix + '/'];
const images = new Map(); // image URL -> first page that uses it

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const res = await fetch(origin + path);
  if (res.status !== 200) {
    failures.push(`${res.status} ${path}`);
    continue;
  }
  if (!(res.headers.get('content-type') ?? '').startsWith('text/html')) continue;
  const html = await res.text();
  if (prefix && !html.includes('<meta name="robots" content="noindex, nofollow">') && !html.includes('content="noindex"')) {
    failures.push(`missing noindex: ${path}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
    const u = new URL(m[1], origin + path).href;
    if (!images.has(u)) images.set(u, path);
  }
  const refs = [
    ...html.matchAll(/(?:href|src)="([^"#]+)/g),
    ...html.matchAll(/<meta http-equiv="refresh" content="\d+; url=([^"]+)"/g), // redirect pages
  ].map((m) => m[1]);
  for (const ref of refs) {
    const u = new URL(ref, origin + path);
    if (u.origin !== origin) continue;
    if (prefix && !u.pathname.startsWith(prefix + '/')) {
      failures.push(`link escapes ${prefix}: ${u.pathname} (on ${path})`);
      continue;
    }
    queue.push(u.pathname);
  }
}

// Images: local ones were requested by the crawl above; check them explicitly too, so a missing
// image is reported as such, and look at third-party ones.
let local = 0, thirdParty = 0;
for (const [src, page] of images) {
  const u = new URL(src);
  if (u.origin === origin) {
    local++;
    const r = await fetch(src, { method: 'HEAD' });
    if (r.status !== 200 || !(r.headers.get('content-type') ?? '').startsWith('image/')) {
      failures.push(`missing image ${u.pathname} (${r.status}) on ${page}`);
    }
    continue;
  }
  thirdParty++;
  if (u.hostname === 'raw.githubusercontent.com') failures.push(`hotlinked image ${src} on ${page}`);
  else if (external) {
    try {
      const r = await fetch(src, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.status !== 200) failures.push(`third-party image ${r.status}: ${src} on ${page}`);
    } catch (e) {
      failures.push(`third-party image unreachable: ${src} on ${page}`);
    }
  }
}

server.close();

console.log(`check-links ${dir}${prefix ? ` under ${prefix}/` : ''}: ${seen.size} URLs · ${local} local images` +
  ` · ${thirdParty} third-party images${external ? ' (checked)' : ''} · ${failures.length} problems`);
for (const f of failures) console.log('  FAIL', f);
process.exit(failures.length ? 1 : 0);
