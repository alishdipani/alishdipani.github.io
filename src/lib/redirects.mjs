// Loads migration/redirects.yml: a map of old path -> new path.
// Shared by the build integration (redirect pages) and the 404 page (lookup table).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

export function loadRedirects(root = process.cwd()) {
  const file = path.join(root, 'migration', 'redirects.yml');
  const map = parse(fs.readFileSync(file, 'utf8')) ?? {};
  for (const [from, to] of Object.entries(map)) {
    if (!from.startsWith('/') || typeof to !== 'string' || !to.startsWith('/')) {
      throw new Error(`redirects.yml: bad entry ${from} -> ${to}`);
    }
  }
  return map;
}

// The instant refresh and the canonical link send search engines to the new page (no noindex).
export function redirectPage(to, site) {
  const abs = new URL(to, site).href;
  const js = JSON.stringify(to);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="${abs}">
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace(${js} + (${js}.includes('#') ? '' : location.hash));</script>
</head>
<body><p>This page has moved to <a href="${to}">${abs}</a>.</p></body>
</html>
`;
}
