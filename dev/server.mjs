// Servidor de prueba local: sirve /public y ejecuta la función real con un Blobs en memoria.
// Uso: node dev/server.mjs  → http://localhost:8888
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
register('./blobs-mock-loader.mjs', import.meta.url);
const { default: handler } = await import('../netlify/functions/api.mjs');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await handler(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  const file = join(root, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  try { const data = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('404'); }
}).listen(process.env.PORT || 8888, () => console.log('Corcho en http://localhost:' + (process.env.PORT || 8888)));
