// Cliente de datos: usa la API de Netlify si está disponible; si no, modo demo local (localStorage).
import { boardOp, adminOp, viewBoard, boardMeta, emptyIndex, sha256, fail, rid } from './core.js';

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { throw fail(507, 'El almacenamiento local está lleno. Usá imágenes más chicas.'); } },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

export const me = {
  get uid() { let u = LS.get('corcho_uid'); if (!u) { u = rid(16); LS.set('corcho_uid', u); } return u; },
  get name() { return LS.get('corcho_name', ''); },
  set name(v) { LS.set('corcho_name', v); },
  get key() { return LS.get('corcho_admin', ''); },
  set key(v) { v ? LS.set('corcho_admin', v) : LS.del('corcho_admin'); },
};

// ---------- backend remoto ----------
class Remote {
  mode = 'netlify';
  async req(path, opts = {}) {
    const headers = { 'x-user': me.uid, ...(opts.headers || {}) };
    if (me.key) headers['x-admin-key'] = me.key;
    if (opts.body && typeof opts.body === 'string') headers['content-type'] = 'application/json';
    const r = await fetch('/api/' + path, { ...opts, headers });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw fail(r.status, j.error || 'Error de red (' + r.status + ')');
    return j;
  }
  login(password) { return this.req('login', { method: 'POST', body: JSON.stringify({ password }) }); }
  setup() { return this.req('setup'); }
  index() { return this.req('index'); }
  course(id) { return this.req('course/' + id); }
  board(id, v) { return this.req('board/' + id + (v != null ? '?v=' + v : '')); }
  op(boardId, op) { return this.req('board/' + boardId, { method: 'POST', body: JSON.stringify(op) }); }
  admin(op) { return this.req('admin', { method: 'POST', body: JSON.stringify(op) }); }
  async upload(blob, name = '') {
    if (blob.size > 5.5 * 1024 * 1024) throw fail(413, 'El archivo supera los 5 MB');
    return this.req('upload', { method: 'POST', body: blob, headers: { 'content-type': blob.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(name) } });
  }
  subscribe() { return () => {}; }
}

// ---------- backend local (demo) ----------
class Local {
  mode = 'local';
  get adminNow() { return !!me.key && me.key === LS.get('corcho_local_pw'); }
  db = {
    getIndex: async () => LS.get('corcho_ix', emptyIndex()),
    mutateIndex: async fn => { const ix = LS.get('corcho_ix', emptyIndex()); await fn(ix); ix.v = (ix.v || 0) + 1; LS.set('corcho_ix', ix); return { doc: ix }; },
    getBoard: async id => LS.get('corcho_b_' + id, null),
    putBoard: async d => LS.set('corcho_b_' + d.id, d),
    mutateBoard: async (id, fn) => { const d = LS.get('corcho_b_' + id, null); if (!d) throw fail(404, 'No existe'); const result = await fn(d); d.v = (d.v || 0) + 1; LS.set('corcho_b_' + id, d); return { doc: d, result }; },
    deleteBoard: async id => LS.del('corcho_b_' + id),
  };
  async login(password) {
    if (!password || password.length < 4) throw fail(400, 'La contraseña debe tener al menos 4 caracteres');
    const cur = LS.get('corcho_local_pw');
    if (!cur) { LS.set('corcho_local_pw', password); return { ok: true, created: true }; }
    if (cur !== password) throw fail(401, 'Contraseña incorrecta');
    return { ok: true };
  }
  async setup() { return { configured: !!LS.get('corcho_local_pw') }; }
  async index() { if (!this.adminNow) throw fail(401, 'Iniciá sesión como docente'); return this.db.getIndex(); }
  async course(id) {
    const ix = await this.db.getIndex(); const course = ix.courses.find(c => c.id === id);
    if (!course) throw fail(404, 'Curso no encontrado');
    return { course, boards: ix.boards.filter(b => b.courseId === id && (this.adminNow || b.listed !== false)) };
  }
  async board(id, v) {
    const d = await this.db.getBoard(id); if (!d) throw fail(404, 'Este muro no existe o fue eliminado');
    if (v != null && +v === d.v) return { same: true, v: d.v };
    return viewBoard(d, { admin: this.adminNow, uid: me.uid });
  }
  async op(id, op) {
    const ctx = { admin: this.adminNow, uid: me.uid };
    const { doc, result } = await this.db.mutateBoard(id, d => boardOp(d, op, ctx));
    if (op.type === 'updateBoard') await this.db.mutateIndex(ix => { const i = ix.boards.findIndex(b => b.id === id); if (i >= 0) ix.boards[i] = boardMeta(doc); });
    return { result, board: viewBoard(doc, ctx) };
  }
  async admin(op) {
    if (!this.adminNow) throw fail(401, 'Iniciá sesión como docente');
    const result = await adminOp(this.db, op);
    return { result, index: await this.db.getIndex() };
  }
  async upload(blob) {
    if (blob.size > 1.5 * 1024 * 1024) throw fail(413, 'En modo demo local el límite es 1,5 MB por archivo');
    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
    return { url };
  }
  subscribe(fn) { const h = e => { if (e.key && e.key.startsWith('corcho_')) fn(); }; addEventListener('storage', h); return () => removeEventListener('storage', h); }
}

export async function connect() {
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch('/api/ping', { signal: ctrl.signal });
    const j = await r.json();
    if (j && j.ok) return new Remote();
  } catch {}
  return new Local();
}
