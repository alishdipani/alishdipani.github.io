// Crawls a build from its home page and fails on any internal link or asset that
// doesn't load (following 301s and redirect pages). Run it on both builds:
//   node scripts/check-links.mjs                                 (dist/, root path)
//   node scripts/check-links.mjs dist-preview /website-preview   (preview build)
// For the preview build it also checks the noindex meta tag and robots.txt.
import { createServer, listen } from './serve.mjs';

const [, , dir = 'dist', prefix = ''] = process.argv;
const server = createServer(dir, prefix);
const origin = `http://127.0.0.1:${await listen(server)}`;
const failures = [];
const seen = new Set();
const queue = [prefix + '/'];

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
  const refs = [...html.matchAll(/(?:href|src)="([^"#]+)/g), ...html.matchAll(/url=([^"]+)"/g)].map((m) => m[1]);
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

if (prefix) {
  const robots = await (await fetch(`${origin}${prefix}/robots.txt`)).text();
  if (!/Disallow: \/\s*$/.test(robots)) failures.push('preview robots.txt does not disallow everything');
}
server.close();

console.log(`check-links ${dir}${prefix ? ` under ${prefix}/` : ''}: ${seen.size} URLs · ${failures.length} problems`);
for (const f of failures) console.log('  FAIL', f);
process.exit(failures.length ? 1 : 0);
