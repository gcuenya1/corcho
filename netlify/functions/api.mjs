// API de Corcho sobre Netlify Functions + Netlify Blobs (sin base de datos externa).
import { getStore } from '@netlify/blobs';
import { boardOp, adminOp, viewBoard, boardMeta, emptyIndex, sha256, fail, rid } from '../../public/js/core.js';

const data = () => getStore({ name: 'corcho-data', consistency: 'strong' });
const files = () => getStore({ name: 'corcho-files', consistency: 'strong' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

// Lectura-modificación-escritura atómica con reintentos (escrituras condicionales por ETag).
async function mutate(key, fn, init) {
  const s = data();
  for (let i = 0; i < 10; i++) {
    const cur = await s.getWithMetadata(key, { type: 'json' });
    const doc = cur ? cur.data : init ? init() : null;
    if (!doc) throw fail(404, 'No existe');
    const result = await fn(doc);
    doc.v = (doc.v || 0) + 1;
    doc.updatedAt = Date.now();
    const w = await s.setJSON(key, doc, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (!w || w.modified !== false) return { doc, result };
    await sleep(20 + Math.random() * 120 * (i + 1));
  }
  throw fail(409, 'Mucha actividad simultánea, probá de nuevo');
}

const db = {
  getIndex: async () => (await data().get('index', { type: 'json' })) || emptyIndex(),
  mutateIndex: fn => mutate('index', fn, emptyIndex),
  getBoard: id => data().get('board/' + id, { type: 'json' }),
  putBoard: doc => data().setJSON('board/' + doc.id, doc),
  mutateBoard: (id, fn) => mutate('board/' + id, fn),
  deleteBoard: id => data().delete('board/' + id),
};

async function isAdmin(req) {
  const key = req.headers.get('x-admin-key');
  if (!key) return false;
  const cfg = await data().get('config', { type: 'json' });
  return !!cfg && cfg.hash === (await sha256(cfg.salt + key));
}

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [route, id] = parts;
  try {
    if (route === 'ping') return json({ ok: true, backend: 'netlify' });

    // --- autenticación docente: la primera contraseña que se use queda registrada ---
    if (route === 'login' && req.method === 'POST') {
      const { password } = await req.json();
      if (!password || password.length < 4) throw fail(400, 'La contraseña debe tener al menos 4 caracteres');
      const cfg = await data().get('config', { type: 'json' });
      if (!cfg) {
        const salt = rid(16);
        await data().setJSON('config', { salt, hash: await sha256(salt + password), createdAt: Date.now() }, { onlyIfNew: true });
        return json({ ok: true, created: true });
      }
      if (cfg.hash !== (await sha256(cfg.salt + password))) throw fail(401, 'Contraseña incorrecta');
      return json({ ok: true });
    }
    if (route === 'setup') { const cfg = await data().get('config', { type: 'json' }); return json({ configured: !!cfg }); }

    // --- archivos (imágenes, audio, dibujos, documentos) ---
    if (route === 'upload' && req.method === 'POST') {
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) throw fail(400, 'Archivo vacío');
      if (buf.byteLength > 5.5 * 1024 * 1024) throw fail(413, 'El archivo supera los 5 MB');
      const fid = rid(16);
      const type = req.headers.get('content-type') || 'application/octet-stream';
      await files().set(fid, buf, { metadata: { type, name: decodeURIComponent(req.headers.get('x-file-name') || '') } });
      return json({ url: '/api/file/' + fid });
    }
    if (route === 'file' && id) {
      const r = await files().getWithMetadata(id, { type: 'arrayBuffer' });
      if (!r) return new Response('No encontrado', { status: 404 });
      return new Response(r.data, { headers: { 'content-type': r.metadata?.type || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' } });
    }

    const admin = await isAdmin(req);
    const uid = req.headers.get('x-user') || url.searchParams.get('u') || '';

    // --- índice completo (solo docente) ---
    if (route === 'index') {
      if (!admin) throw fail(401, 'Iniciá sesión como docente');
      return json(await db.getIndex());
    }

    // --- página pública de un curso ---
    if (route === 'course' && id) {
      const ix = await db.getIndex();
      const course = ix.courses.find(c => c.id === id);
      if (!course) throw fail(404, 'Curso no encontrado');
      return json({ course, boards: ix.boards.filter(b => b.courseId === id && (admin || b.listed !== false)) });
    }

    // --- muro ---
    if (route === 'board' && id) {
      if (req.method === 'GET') {
        const doc = await db.getBoard(id);
        if (!doc) throw fail(404, 'Este muro no existe o fue eliminado');
        const since = url.searchParams.get('v');
        if (since && +since === doc.v) return json({ same: true, v: doc.v });
        return json(viewBoard(doc, { admin, uid }));
      }
      if (req.method === 'POST') {
        const op = await req.json();
        const { doc, result } = await db.mutateBoard(id, d => boardOp(d, op, { admin, uid }));
        if (op.type === 'updateBoard') {
          await db.mutateIndex(ix => { const i = ix.boards.findIndex(b => b.id === id); if (i >= 0) ix.boards[i] = boardMeta(doc); });
        }
        return json({ result, board: viewBoard(doc, { admin, uid }) });
      }
    }

    // --- operaciones de administración (cursos, crear/duplicar muros) ---
    if (route === 'admin' && req.method === 'POST') {
      if (!admin) throw fail(401, 'Iniciá sesión como docente');
      const result = await adminOp(db, await req.json());
      return json({ result, index: await db.getIndex() });
    }

    throw fail(404, 'Ruta inexistente');
  } catch (e) {
    console.error(e);
    return json({ error: e.message || 'Error' }, e.status || 500);
  }
};

export const config = { path: '/api/*' };
