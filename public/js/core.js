// Corcho — lógica compartida entre el servidor (Netlify Function) y el modo local.
// Funciones puras que operan sobre documentos JSON.

export const rid = (n = 10) => {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => a[b % a.length]).join('');
};

export function fail(status, msg) { const e = new Error(msg); e.status = status; return e; }

const str = (v, max = 200) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const okUrl = u => typeof u === 'string' && (/^https?:\/\//i.test(u) || /^\/api\/file\//.test(u) || /^data:(image|audio|application)\//.test(u));

export const LAYOUTS = [
  { id: 'wall', name: 'Muro', icon: '🧱', desc: 'Tarjetas tipo ladrillo' },
  { id: 'grid', name: 'Grilla', icon: '▦', desc: 'Filas y columnas ordenadas' },
  { id: 'stream', name: 'Flujo', icon: '☰', desc: 'Una columna, de arriba a abajo' },
  { id: 'columns', name: 'Columnas', icon: '▥', desc: 'Secciones lado a lado' },
  { id: 'canvas', name: 'Lienzo', icon: '✳️', desc: 'Libre, arrastrá y conectá' },
  { id: 'timeline', name: 'Línea de tiempo', icon: '⟿', desc: 'Ordenado por fecha' },
  { id: 'map', name: 'Mapa', icon: '🗺️', desc: 'Publicaciones en un mapa' },
];

export const WALLPAPERS = [
  { id: 'cork', name: 'Corcho', css: 'radial-gradient(circle at 20% 30%, rgba(120,70,20,.18) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, rgba(90,50,10,.15) 0 1.5px, transparent 2.5px), radial-gradient(circle at 40% 80%, rgba(255,230,190,.25) 0 2px, transparent 3px), #c9955c', size: '23px 23px, 17px 17px, 29px 29px', dark: false },
  { id: 'chalk', name: 'Pizarrón', css: 'radial-gradient(ellipse at top, rgba(255,255,255,.08), transparent 60%), linear-gradient(160deg,#2f4a3a,#1f3328)', dark: true },
  { id: 'notebook', name: 'Cuaderno', css: 'linear-gradient(90deg, transparent 70px, rgba(230,80,80,.45) 70px 72px, transparent 72px), repeating-linear-gradient(#fdfcf7 0 31px, #b8d0ea 31px 32px)', dark: false },
  { id: 'graph', name: 'Cuadriculado', css: 'linear-gradient(rgba(60,120,200,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(60,120,200,.14) 1px, transparent 1px), #f7fbff', size: '24px 24px', dark: false },
  { id: 'blueprint', name: 'Plano', css: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px), #1d4e89', size: '100px 100px, 100px 100px, 20px 20px, 20px 20px', dark: true },
  { id: 'dots', name: 'Puntitos', css: 'radial-gradient(rgba(80,60,160,.25) 1.5px, transparent 1.6px), #f4f1ff', size: '22px 22px', dark: false },
  { id: 'sunset', name: 'Atardecer', css: 'linear-gradient(135deg,#ff9a8b 0%,#ff6a88 45%,#ff99ac 100%)', dark: false },
  { id: 'aurora', name: 'Aurora', css: 'radial-gradient(at 20% 20%,#7cf3c5 0,transparent 50%),radial-gradient(at 80% 10%,#8f7bff 0,transparent 50%),radial-gradient(at 60% 90%,#ff7bd5 0,transparent 50%),#14123a', dark: true },
  { id: 'ocean', name: 'Océano', css: 'linear-gradient(160deg,#00c6fb 0%,#005bea 100%)', dark: true },
  { id: 'mint', name: 'Menta', css: 'linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)', dark: false },
  { id: 'candy', name: 'Golosina', css: 'linear-gradient(135deg,#fbc2eb 0%,#a6c1ee 100%)', dark: false },
  { id: 'peach', name: 'Durazno', css: 'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)', dark: false },
  { id: 'night', name: 'Noche', css: 'radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 80%,#fff,transparent),radial-gradient(1.5px 1.5px at 40% 60%,#fff,transparent),radial-gradient(1px 1px at 85% 20%,#fff,transparent),linear-gradient(180deg,#0b1026,#2b1055)', size: '200px 200px, 260px 260px, 310px 310px, 180px 180px, 100% 100%', dark: true },
  { id: 'paper', name: 'Papel', css: '#f6f3ec', dark: false },
  { id: 'charcoal', name: 'Carbón', css: '#202227', dark: true },
  { id: 'lemon', name: 'Limón', css: '#fff4a8', dark: false },
];

export const CARD_COLORS = [
  { id: 'white', bg: '#ffffff', fg: '#1d1d1f' },
  { id: 'yellow', bg: '#fff3a3', fg: '#3a3000' },
  { id: 'pink', bg: '#ffc9de', fg: '#4a0f2a' },
  { id: 'peach', bg: '#ffd4b0', fg: '#4a2205' },
  { id: 'green', bg: '#c8f2c2', fg: '#123d0c' },
  { id: 'blue', bg: '#c3e3ff', fg: '#0c2c4a' },
  { id: 'purple', bg: '#dccfff', fg: '#25105a' },
  { id: 'red', bg: '#ff8a8a', fg: '#3d0505' },
  { id: 'teal', bg: '#9eeedc', fg: '#063a31' },
  { id: 'dark', bg: '#25262b', fg: '#f3f3f5' },
];

export const FONTS = [
  { id: 'outfit', name: 'Moderna', css: "'Outfit', system-ui, sans-serif" },
  { id: 'caveat', name: 'Manuscrita', css: "'Caveat', cursive" },
  { id: 'fraunces', name: 'Clásica', css: "'Fraunces', Georgia, serif" },
  { id: 'baloo', name: 'Redondita', css: "'Baloo 2', system-ui, sans-serif" },
  { id: 'mono', name: 'Código', css: "'Space Mono', ui-monospace, monospace" },
];

export const REACTIONS = [
  { id: 'none', name: 'Sin reacciones' },
  { id: 'like', name: 'Me gusta ❤️' },
  { id: 'vote', name: 'Votar 👍 👎' },
  { id: 'star', name: 'Estrellas ⭐' },
  { id: 'emoji', name: 'Emojis 😂🔥👏' },
  { id: 'grade', name: 'Nota del docente 💯' },
];

export const EMOJI_SET = ['❤️', '😂', '😮', '🔥', '👏', '🤔', '💯', '🎉'];

export const DEFAULT_SETTINGS = {
  reactions: 'like', comments: true, moderation: false, anonymous: true,
  locked: false, showAuthor: true, allowMove: false, listed: true,
};

export const TEMPLATES = [
  { id: 'blank', name: 'En blanco', emoji: '📌', desc: 'Empezá de cero', layout: 'wall', wallpaper: 'cork' },
  { id: 'ideas', name: 'Lluvia de ideas', emoji: '💡', desc: 'Todos aportan, se vota lo mejor', layout: 'wall', wallpaper: 'aurora', title: 'Lluvia de ideas', description: 'Sumá tu idea. ¡No hay respuestas incorrectas!', cardStyle: 'sticky', settings: { reactions: 'vote' } },
  { id: 'kwl', name: 'Sé · Quiero · Aprendí', emoji: '🧠', desc: 'Organizador KWL en columnas', layout: 'columns', wallpaper: 'notebook', title: 'Sé · Quiero saber · Aprendí', sections: ['Lo que sé', 'Lo que quiero saber', 'Lo que aprendí'] },
  { id: 'exit', name: 'Ticket de salida', emoji: '🎟️', desc: 'Cierre de clase rápido', layout: 'stream', wallpaper: 'peach', title: 'Ticket de salida', description: '1) ¿Qué aprendiste hoy?  2) ¿Qué te quedó dando vueltas?', settings: { reactions: 'none', showAuthor: true } },
  { id: 'debate', name: 'Debate', emoji: '⚖️', desc: 'A favor vs. en contra', layout: 'columns', wallpaper: 'graph', title: 'Debate', sections: ['A favor 👍', 'En contra 👎', 'Preguntas ❓'], settings: { reactions: 'vote' } },
  { id: 'gallery', name: 'Galería de trabajos', emoji: '🖼️', desc: 'Muestra con estrellas', layout: 'grid', wallpaper: 'charcoal', title: 'Galería de trabajos', settings: { reactions: 'star' } },
  { id: 'mindmap', name: 'Mapa mental', emoji: '🕸️', desc: 'Lienzo libre para conectar ideas', layout: 'canvas', wallpaper: 'dots', title: 'Mapa mental', cardStyle: 'sticky', settings: { allowMove: true } },
  { id: 'timeline', name: 'Línea de tiempo', emoji: '⏳', desc: 'Hechos ordenados por fecha', layout: 'timeline', wallpaper: 'paper', title: 'Línea de tiempo' },
  { id: 'map', name: 'Mapa', emoji: '🗺️', desc: 'Lugares, viajes, historia', layout: 'map', wallpaper: 'ocean', title: 'Mapa colaborativo' },
  { id: 'retro', name: 'Retro de la semana', emoji: '🔁', desc: 'Me gustó / Mejoraría / Idea', layout: 'columns', wallpaper: 'candy', title: 'Retro de la semana', sections: ['😀 Me gustó', '🛠️ Mejoraría', '✨ Idea nueva'], settings: { reactions: 'emoji' } },
  { id: 'qa', name: 'Preguntas al profe', emoji: '🙋', desc: 'Dudas anónimas moderadas', layout: 'stream', wallpaper: 'chalk', title: 'Preguntas al profe', description: 'Escribí tu duda. Se publican al ser aprobadas.', settings: { reactions: 'like', moderation: true, anonymous: true, showAuthor: false } },
  { id: 'warmup', name: 'Rompehielo', emoji: '🧊', desc: 'Presentaciones del curso', layout: 'grid', wallpaper: 'sunset', title: '¡Hola! ¿Quién sos?', description: 'Contanos tu nombre, algo que te guste y subí una foto o dibujo.', cardStyle: 'sticky', settings: { reactions: 'emoji' } },
];

export function makeBoard(input = {}) {
  const t = TEMPLATES.find(x => x.id === input.template) || TEMPLATES[0];
  const sections = (input.sections || t.sections || ['General']).map(s => (typeof s === 'string' ? { id: rid(6), title: s } : s));
  return {
    id: input.id || rid(10),
    courseId: str(input.courseId, 40),
    title: str(input.title || t.title || 'Nuevo muro', 120),
    description: str(input.description ?? t.description ?? '', 500),
    emoji: str(input.emoji || t.emoji || '📌', 8),
    layout: input.layout || t.layout || 'wall',
    wallpaper: input.wallpaper || t.wallpaper || 'cork',
    font: input.font || 'outfit',
    cardStyle: input.cardStyle || t.cardStyle || 'clean',
    settings: { ...DEFAULT_SETTINGS, ...(t.settings || {}), ...(input.settings || {}) },
    sections,
    posts: [],
    createdAt: Date.now(),
    v: 0,
  };
}

export function boardMeta(b) {
  return { id: b.id, courseId: b.courseId, title: b.title, emoji: b.emoji, layout: b.layout, wallpaper: b.wallpaper, description: b.description, listed: b.settings?.listed !== false, createdAt: b.createdAt, count: (b.posts || []).length };
}

export function cloneBoard(src, courseId, withPosts) {
  const map = {};
  const sections = src.sections.map(s => { const id = rid(6); map[s.id] = id; return { id, title: s.title }; });
  const b = { ...JSON.parse(JSON.stringify(src)), id: rid(10), courseId, sections, createdAt: Date.now(), v: 0 };
  b.posts = withPosts ? b.posts.filter(p => p.approved !== false).map(p => ({ ...p, id: rid(10), sectionId: map[p.sectionId] || sections[0]?.id, reactions: {}, comments: [], grade: '', poll: p.poll ? { ...p.poll, options: p.poll.options.map(o => ({ ...o, votes: {} })) } : undefined })) : [];
  return b;
}

// ---------- vista para el cliente (oculta ids de usuarios) ----------
export function summarize(post, mode, uid) {
  const r = post.reactions || {};
  const vals = Object.entries(r);
  const mine = r[uid];
  if (mode === 'like') return { count: vals.filter(([, v]) => v === 1).length, mine: mine === 1 };
  if (mode === 'vote') { let up = 0, down = 0; vals.forEach(([, v]) => { if (v === 1) up++; else if (v === -1) down++; }); return { up, down, score: up - down, mine: typeof mine === 'number' ? mine : 0 }; }
  if (mode === 'star') { const n = vals.filter(([, v]) => typeof v === 'number' && v >= 1 && v <= 5); const avg = n.length ? n.reduce((a, [, v]) => a + v, 0) / n.length : 0; return { avg, n: n.length, mine: typeof mine === 'number' ? mine : 0 }; }
  if (mode === 'emoji') { const counts = {}; vals.forEach(([, v]) => Array.isArray(v) && v.forEach(e => (counts[e] = (counts[e] || 0) + 1))); return { counts, mine: Array.isArray(mine) ? mine : [] }; }
  return {};
}

export function viewBoard(doc, { admin = false, uid = '' } = {}) {
  const mode = doc.settings.reactions;
  const posts = doc.posts
    .filter(p => p.approved !== false || admin || p.uid === uid)
    .map(p => {
      const { uid: owner, reactions, comments = [], poll, ...rest } = p;
      const out = { ...rest, mine: owner === uid, react: summarize(p, mode, uid), comments: comments.map(({ uid: cu, ...c }) => ({ ...c, mine: cu === uid })) };
      if (!doc.settings.showAuthor && !admin && owner !== uid) out.author = '';
      if (poll) out.poll = { question: poll.question, options: poll.options.map(o => ({ id: o.id, text: o.text, n: Object.keys(o.votes || {}).length, mine: !!(o.votes || {})[uid] })) };
      return out;
    });
  const { posts: _p, ...board } = doc;
  return { ...board, posts, admin };
}

// ---------- operaciones sobre un muro ----------
function cleanAttach(a) {
  if (!a || typeof a !== 'object') return null;
  const kind = str(a.kind, 12);
  if (!['image', 'link', 'video', 'audio', 'draw', 'file'].includes(kind)) return null;
  if (!okUrl(a.url)) return null;
  return { kind, url: str(a.url, 6_000_000), name: str(a.name, 200), mime: str(a.mime, 80) };
}
function cleanPoll(p) {
  if (!p || !Array.isArray(p.options)) return undefined;
  const options = p.options.map(o => str(typeof o === 'string' ? o : o.text, 120).trim()).filter(Boolean).slice(0, 8).map(text => ({ id: rid(5), text, votes: {} }));
  return options.length >= 2 ? { question: str(p.question, 200), options } : undefined;
}

export function boardOp(doc, op, { admin = false, uid = '' } = {}) {
  const s = doc.settings;
  const post = () => { const p = doc.posts.find(x => x.id === op.id); if (!p) throw fail(404, 'La publicación ya no existe'); return p; };
  const own = p => { if (!(admin || (uid && p.uid === uid))) throw fail(403, 'Solo el autor o el docente pueden hacer eso'); };
  const needAdmin = () => { if (!admin) throw fail(403, 'Solo para docentes'); };
  const notLocked = () => { if (s.locked && !admin) throw fail(423, 'Este muro está bloqueado'); };
  const secOk = id => doc.sections.some(x => x.id === id) ? id : doc.sections[0]?.id;
  const maxOrder = sec => Math.max(0, ...doc.posts.filter(p => p.sectionId === sec).map(p => p.order || 0));

  switch (op.type) {
    case 'addPost': {
      notLocked();
      if (doc.posts.length >= 800) throw fail(413, 'El muro llegó al máximo de publicaciones');
      const title = str(op.title, 200).trim(), body = str(op.body, 5000).trim();
      const attach = cleanAttach(op.attach), poll = cleanPoll(op.poll);
      if (!title && !body && !attach && !poll) throw fail(400, 'La publicación está vacía');
      let author = str(op.author, 60).trim();
      if (!author) { if (!s.anonymous && !admin) throw fail(400, 'Este muro pide tu nombre'); author = 'Anónimo'; }
      const sectionId = secOk(op.sectionId);
      const p = {
        id: rid(10), uid, author, title, body, attach, poll,
        color: CARD_COLORS.some(c => c.id === op.color) ? op.color : 'white',
        sectionId, order: maxOrder(sectionId) + 1,
        x: num(op.x, 80 + Math.random() * 700), y: num(op.y, 80 + Math.random() * 400),
        lat: op.lat == null ? null : num(op.lat), lng: op.lng == null ? null : num(op.lng),
        date: str(op.date, 20), approved: admin || !s.moderation, pinned: false, grade: '',
        reactions: {}, comments: [], createdAt: Date.now(), byAdmin: admin,
      };
      if (!poll) delete p.poll;
      doc.posts.push(p);
      return p.id;
    }
    case 'updatePost': {
      notLocked(); const p = post(); own(p);
      if ('title' in op) p.title = str(op.title, 200);
      if ('body' in op) p.body = str(op.body, 5000);
      if ('attach' in op) p.attach = cleanAttach(op.attach);
      if ('color' in op && CARD_COLORS.some(c => c.id === op.color)) p.color = op.color;
      if ('date' in op) p.date = str(op.date, 20);
      if ('lat' in op) { p.lat = op.lat == null ? null : num(op.lat); p.lng = op.lng == null ? null : num(op.lng); }
      if ('sectionId' in op) p.sectionId = secOk(op.sectionId);
      if ('author' in op && str(op.author, 60).trim()) p.author = str(op.author, 60).trim();
      p.editedAt = Date.now();
      return p.id;
    }
    case 'movePost': {
      const p = post();
      if (!(admin || s.allowMove || p.uid === uid)) throw fail(403, 'No podés mover esta publicación');
      notLocked();
      if ('x' in op) { p.x = Math.max(0, num(op.x)); p.y = Math.max(0, num(op.y)); }
      if ('lat' in op) { p.lat = num(op.lat); p.lng = num(op.lng); }
      if ('sectionId' in op) {
        const sec = secOk(op.sectionId);
        const list = doc.posts.filter(x => x.sectionId === sec && x.id !== p.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        const i = Math.max(0, Math.min(list.length, num(op.index, list.length)));
        list.splice(i, 0, p); p.sectionId = sec;
        list.forEach((x, k) => (x.order = k + 1));
      }
      return p.id;
    }
    case 'deletePost': { const p = post(); own(p); doc.posts = doc.posts.filter(x => x !== p); return p.id; }
    case 'react': {
      notLocked(); const p = post(); if (!uid) throw fail(400, 'Falta identificador');
      p.reactions = p.reactions || {};
      const cur = p.reactions[uid], v = op.value, mode = s.reactions;
      if (mode === 'like') { if (cur === 1) delete p.reactions[uid]; else p.reactions[uid] = 1; }
      else if (mode === 'vote') { if (![1, -1].includes(v)) throw fail(400, 'Voto inválido'); if (cur === v) delete p.reactions[uid]; else p.reactions[uid] = v; }
      else if (mode === 'star') { const n = Math.round(num(v)); if (n < 1 || n > 5) throw fail(400, 'Estrellas 1 a 5'); if (cur === n) delete p.reactions[uid]; else p.reactions[uid] = n; }
      else if (mode === 'emoji') { if (!EMOJI_SET.includes(v)) throw fail(400, 'Emoji inválido'); const arr = Array.isArray(cur) ? cur : []; const next = arr.includes(v) ? arr.filter(e => e !== v) : [...arr, v]; if (next.length) p.reactions[uid] = next; else delete p.reactions[uid]; }
      else throw fail(400, 'Las reacciones están desactivadas');
      return p.id;
    }
    case 'pollVote': {
      notLocked(); const p = post(); if (!p.poll) throw fail(400, 'No es una encuesta');
      const target = p.poll.options.find(o => o.id === op.optionId); if (!target) throw fail(404, 'Opción inválida');
      const had = !!target.votes[uid];
      p.poll.options.forEach(o => delete o.votes[uid]);
      if (!had) target.votes[uid] = 1;
      return p.id;
    }
    case 'comment': {
      notLocked(); if (!s.comments && !admin) throw fail(403, 'Comentarios desactivados');
      const p = post(); const text = str(op.text, 1000).trim(); if (!text) throw fail(400, 'Comentario vacío');
      p.comments = p.comments || [];
      if (p.comments.length >= 200) throw fail(413, 'Demasiados comentarios');
      p.comments.push({ id: rid(8), uid, author: str(op.author, 60).trim() || 'Anónimo', text, at: Date.now(), byAdmin: admin });
      return p.id;
    }
    case 'deleteComment': {
      const p = post(); const c = (p.comments || []).find(x => x.id === op.commentId); if (!c) return p.id;
      if (!(admin || c.uid === uid)) throw fail(403, 'No podés borrar ese comentario');
      p.comments = p.comments.filter(x => x !== c); return p.id;
    }
    case 'approve': { needAdmin(); const p = post(); p.approved = op.value !== false; return p.id; }
    case 'pin': { needAdmin(); const p = post(); p.pinned = !p.pinned; return p.id; }
    case 'grade': { needAdmin(); const p = post(); p.grade = str(op.grade, 20); return p.id; }
    case 'approveAll': { needAdmin(); doc.posts.forEach(p => (p.approved = true)); return true; }
    case 'clearPosts': { needAdmin(); doc.posts = []; return true; }
    case 'updateBoard': {
      needAdmin();
      const pt = op.patch || {};
      if ('title' in pt) doc.title = str(pt.title, 120) || 'Sin título';
      if ('description' in pt) doc.description = str(pt.description, 500);
      if ('emoji' in pt) doc.emoji = str(pt.emoji, 8) || '📌';
      if (LAYOUTS.some(l => l.id === pt.layout)) doc.layout = pt.layout;
      if (typeof pt.wallpaper === 'string' && (WALLPAPERS.some(w => w.id === pt.wallpaper) || /^url:(https?:\/\/|\/api\/file\/)/.test(pt.wallpaper))) doc.wallpaper = str(pt.wallpaper, 1000);
      if (FONTS.some(f => f.id === pt.font)) doc.font = pt.font;
      if (['clean', 'sticky', 'glass', 'outline'].includes(pt.cardStyle)) doc.cardStyle = pt.cardStyle;
      if (pt.settings && typeof pt.settings === 'object') {
        for (const k of Object.keys(DEFAULT_SETTINGS)) if (k in pt.settings) doc.settings[k] = k === 'reactions' ? (REACTIONS.some(r => r.id === pt.settings[k]) ? pt.settings[k] : doc.settings[k]) : !!pt.settings[k];
      }
      if (Array.isArray(pt.sections) && pt.sections.length) {
        doc.sections = pt.sections.slice(0, 20).map(x => ({ id: str(x.id, 12) || rid(6), title: str(x.title, 80) || 'Sección' }));
        const first = doc.sections[0].id;
        doc.posts.forEach(p => { if (!doc.sections.some(x => x.id === p.sectionId)) p.sectionId = first; });
      }
      return true;
    }
    default: throw fail(400, 'Operación desconocida: ' + op.type);
  }
}

// ---------- operaciones del índice (cursos) ----------
export function makeCourse(input = {}) {
  return { id: rid(8), name: str(input.name, 80) || 'Nuevo curso', emoji: str(input.emoji, 8) || '🎒', color: str(input.color, 20) || '#7c5cff', createdAt: Date.now() };
}

export function emptyIndex() { return { courses: [], boards: [], v: 0 }; }

export async function sha256(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Ejecuta una operación de administración que puede tocar varios documentos.
 * `db` debe exponer: getIndex(), mutateIndex(fn), getBoard(id), putBoard(doc), mutateBoard(id, fn), deleteBoard(id)
 */
export async function adminOp(db, op) {
  switch (op.type) {
    case 'createCourse': { const c = makeCourse(op); await db.mutateIndex(ix => { ix.courses.push(c); }); return c; }
    case 'updateCourse': {
      await db.mutateIndex(ix => { const c = ix.courses.find(x => x.id === op.id); if (!c) throw fail(404, 'Curso inexistente'); if (op.name) c.name = str(op.name, 80); if (op.emoji) c.emoji = str(op.emoji, 8); if (op.color) c.color = str(op.color, 20); });
      return true;
    }
    case 'reorderCourses': { await db.mutateIndex(ix => { const pos = new Map((op.ids || []).map((id, i) => [id, i])); ix.courses.sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999)); }); return true; }
    case 'deleteCourse': {
      const ix = await db.getIndex();
      const ids = ix.boards.filter(b => b.courseId === op.id).map(b => b.id);
      for (const id of ids) await db.deleteBoard(id);
      await db.mutateIndex(ix2 => { ix2.courses = ix2.courses.filter(c => c.id !== op.id); ix2.boards = ix2.boards.filter(b => b.courseId !== op.id); });
      return true;
    }
    case 'createBoard': {
      const b = makeBoard(op);
      await db.putBoard(b);
      await db.mutateIndex(ix => { ix.boards.push(boardMeta(b)); });
      return b.id;
    }
    case 'deleteBoard': { await db.deleteBoard(op.id); await db.mutateIndex(ix => { ix.boards = ix.boards.filter(b => b.id !== op.id); }); return true; }
    case 'moveBoard': {
      await db.mutateBoard(op.id, d => { d.courseId = op.courseId; });
      await db.mutateIndex(ix => { const m = ix.boards.find(b => b.id === op.id); if (m) m.courseId = op.courseId; });
      return true;
    }
    case 'duplicateBoard': {
      const src = await db.getBoard(op.id); if (!src) throw fail(404, 'Muro inexistente');
      const targets = (op.courseIds && op.courseIds.length ? op.courseIds : [src.courseId]).slice(0, 40);
      const made = [];
      for (const cid of targets) {
        const b = cloneBoard(src, cid, !!op.withPosts);
        if (cid === src.courseId) b.title = src.title + ' (copia)';
        await db.putBoard(b); made.push(boardMeta(b));
      }
      await db.mutateIndex(ix => { ix.boards.push(...made); });
      return made.map(m => m.id);
    }
    case 'cloneCourse': {
      const ix = await db.getIndex();
      const src = ix.courses.find(c => c.id === op.id); if (!src) throw fail(404, 'Curso inexistente');
      const names = (op.names || []).map(n => str(n, 80).trim()).filter(Boolean).slice(0, 20);
      const metas = [], courses = [];
      for (const name of names) {
        const c = makeCourse({ name, emoji: src.emoji, color: op.color || src.color }); courses.push(c);
        for (const m of ix.boards.filter(b => b.courseId === src.id)) {
          const full = await db.getBoard(m.id); if (!full) continue;
          const b = cloneBoard(full, c.id, !!op.withPosts); await db.putBoard(b); metas.push(boardMeta(b));
        }
      }
      await db.mutateIndex(ix2 => { ix2.courses.push(...courses); ix2.boards.push(...metas); });
      return courses.map(c => c.id);
    }
    default: throw fail(400, 'Operación desconocida: ' + op.type);
  }
}
