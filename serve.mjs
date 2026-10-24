// Petit serveur local pour prévisualiser dist/ (http://localhost:4173)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = process.env.PORT || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf', '.txt': 'text/plain', '.xml': 'application/xml' };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.normalize(path.join(DIST, p));
  if (!f.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); res.end(fs.readFileSync(path.join(DIST, '404.html'))); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`Prévisualisation : http://localhost:${PORT}`));

if (process.argv.includes('--watch')) {
  let t;
  for (const dir of ['content', 'public', 'build.mjs']) {
    fs.watch(path.join(ROOT, dir), { recursive: true }, () => {
      clearTimeout(t);
      t = setTimeout(() => spawnSync('node', ['build.mjs'], { cwd: ROOT, stdio: 'inherit' }), 300);
    });
  }
  console.log('Reconstruction automatique activée.');
}
