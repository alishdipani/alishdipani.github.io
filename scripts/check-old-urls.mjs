// Builds the site, serves it like GitHub Pages, and requests every path in
// migration/old-urls.txt. A path passes if it returns 200 directly, or after
// a 301 (missing trailing slash) and/or the redirect page it lands on, as long
// as the final target is a real 200 page. Fails on any 404.
// Usage: node scripts/check-old-urls.mjs [--no-build]
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { createServer, listen } from './serve.mjs';

if (!process.argv.includes('--no-build')) execSync('npx astro build', { stdio: 'inherit' });

const paths = fs.readFileSync('migration/old-urls.txt', 'utf8').split('\n').filter(Boolean);
const server = createServer('dist');
const port = await listen(server);
const base = `http://127.0.0.1:${port}`;

const metaRefresh = (html) => html.match(/<meta http-equiv="refresh" content="0; url=([^"]+)"/)?.[1];

async function resolve(path) {
  const hops = [];
  let current = path;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(base + encodeURI(current), { redirect: 'manual' });
    if (res.status === 301) {
      current = res.headers.get('location');
      hops.push(`301 ${current}`);
      continue;
    }
    if (res.status !== 200) return { ok: false, status: res.status, hops };
    const type = res.headers.get('content-type') ?? '';
    const next = type.startsWith('text/html') ? metaRefresh(await res.text()) : undefined;
    if (!next) return { ok: true, status: 200, hops, final: current };
    current = next.split('#')[0];
    hops.push(`→ ${next}`);
  }
  return { ok: false, status: 'too many redirects', hops };
}

let kept = 0, redirected = 0;
const failures = [];
for (const path of paths) {
  const r = await resolve(path);
  if (!r.ok) failures.push(`${r.status} ${path} ${r.hops.join(' ')}`);
  else if (r.hops.length) redirected++;
  else kept++;
}
server.close();

console.log(`\ncheck-old-urls: ${paths.length} old URLs · ${kept} still exist · ${redirected} redirect · ${failures.length} fail`);
if (failures.length) {
  for (const f of failures) console.log('  FAIL', f);
  process.exit(1);
}
console.log('PASS');
