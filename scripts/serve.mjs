// Static server for dist/ that behaves like GitHub Pages:
// /dir/ serves /dir/index.html, /dir (no slash) 301s to /dir/, and anything
// missing gets 404.html with status 404.
// Usage: node scripts/serve.mjs [port]   (default 4321)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.bib': 'text/plain; charset=utf-8',
};

const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();

export function createServer(root = 'dist') {
  root = path.resolve(root);
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch { rel = url.pathname; }
    let file = path.join(root, rel);
    if (!file.startsWith(root)) { res.writeHead(400).end(); return; }

    if (isDir(file)) {
      if (!rel.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' + url.search }).end();
        return;
      }
      file = path.join(file, 'index.html');
    }
    let status = 200;
    if (!isFile(file)) {
      status = 404;
      file = path.join(root, '404.html');
    }
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).pipe(res);
  });
}

export function listen(server, port = 0) {
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server.address().port)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = await listen(createServer('dist'), Number(process.argv[2] ?? 4321));
  console.log(`Serving dist/ at http://127.0.0.1:${port}/`);
}
