import { LAYOUTS, WALLPAPERS, CARD_COLORS, FONTS, REACTIONS, EMOJI_SET, TEMPLATES, rid } from './core.js';
import { connect, me } from './api.js';

let api;
const $app = document.getElementById('app');
const S = { index: null, courseId: null, board: null, timer: null, unsub: null, search: '', sort: 'new', zoom: 1, seen: new Set(), map: null, markers: {}, dragging: false, boardSig: '' };

// ======================= utilidades =======================
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const boardUrl = id => `${location.origin}${location.pathname}#/b/${id}`;
const courseUrl = id => `${location.origin}${location.pathname}#/c/${id}`;
const colorOf = id => CARD_COLORS.find(c => c.id === id) || CARD_COLORS[0];

function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), err ? 4200 : 2600);
}
async function run(fn) { try { return await fn(); } catch (e) { console.error(e); toast(e.message || 'Algo salió mal', true); if (e.status === 401 && me.key) { me.key = ''; } return undefined; } }

function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 45) return 'recién';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.round(s / 86400)} d`;
  return new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
function avColor(name = '') { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 65% 52%)`; }
const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

function md(text) {
  let h = esc(text);
  h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/~~(.+?)~~/g, '<s>$1</s>');
  h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return h;
}

function wpStyle(id) {
  if (id && id.startsWith('url:')) { const u = id.slice(4).replace(/'/g, '%27'); return { style: `background:url('${u}') center/cover fixed #333;`, dark: true }; }
  const w = WALLPAPERS.find(x => x.id === id) || WALLPAPERS[0];
  return { style: `background:${w.css};${w.size ? `background-size:${w.size};` : ''}`, dark: w.dark };
}

function embedSrc(url) {
  try {
    const u = new URL(url); const h = u.hostname.replace(/^www\.|^m\./, '');
    if (h === 'youtube.com' || h === 'youtu.be' || h === 'youtube-nocookie.com') {
      let id = h === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
      if (!id) { const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]+)/); if (m) id = m[2]; }
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (h === 'vimeo.com') { const m = u.pathname.match(/\/(\d+)/); return m ? `https://player.vimeo.com/video/${m[1]}` : null; }
    if (h === 'open.spotify.com') return `https://open.spotify.com/embed${u.pathname}`;
    if (h === 'docs.google.com') { if (/\/forms\//.test(u.pathname)) return url.replace(/\/viewform.*$|\/edit.*$/, '/viewform?embedded=true'); return url.replace(/\/(edit|view|pub)[^/]*$/, '') .replace(/\/$/, '') + '/preview'; }
    if (h === 'drive.google.com') { const m = u.pathname.match(/\/file\/d\/([\w-]+)/); return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null; }
    if (h === 'canva.com' && /\/design\//.test(u.pathname)) return url.split('?')[0].replace(/\/(edit|view)$/, '') + '/view?embed';
    if (h === 'genial.ly' || h === 'view.genial.ly') return url;
    if (h === 'wordwall.net' && /resource/.test(u.pathname)) return url.replace('/resource/', '/embed/resource/');
    return null;
  } catch { return null; }
}
const isImageUrl = u => /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(u);
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

// ======================= modales / menús =======================
function modal({ title = '', body = '', foot = '', wide = false, cls = '', onClose } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">
    ${title ? `<div class="modal-head"><h2>${title}</h2><button class="btn icon ghost" data-close aria-label="Cerrar">✕</button></div>` : ''}
    <div class="modal-body"></div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  const b = $('.modal-body', ov);
  typeof body === 'string' ? (b.innerHTML = body) : b.append(body);
  const close = () => { ov.remove(); document.removeEventListener('keydown', key); onClose && onClose(); };
  const key = e => { if (e.key === 'Escape' && document.body.lastElementChild === ov) close(); };
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  ov.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', key);
  document.body.append(ov);
  setTimeout(() => { const f = $('input:not([type=hidden]):not([type=checkbox]),textarea', ov); if (f && !ov.contains(document.activeElement)) f.focus(); }, 60);
  return { el: ov, body: b, close };
}
function ask(title, msg, ok = 'Aceptar', danger = false) {
  return new Promise(res => {
    const m = modal({ title, body: `<p style="margin:0;line-height:1.5">${msg}</p>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${ok}</button>`, onClose: () => res(false) });
    $('[data-ok]', m.el).onclick = () => { res(true); m.el.remove(); };
  });
}
function promptDlg(title, label, value = '', ok = 'Guardar') {
  return new Promise(res => {
    const m = modal({ title, body: `<label class="field">${label}<input type="text" value="${esc(value)}" maxlength="120"></label>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" data-ok>${ok}</button>`, onClose: () => res(null) });
    const inp = $('input', m.el);
    const done = () => { res(inp.value.trim()); m.el.remove(); };
    $('[data-ok]', m.el).onclick = done;
    inp.onkeydown = e => { if (e.key === 'Enter') done(); };
  });
}
let openMenu = null;
function menu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  items.filter(Boolean).forEach(it => {
    if (it === '-') { m.append(document.createElement('hr')); return; }
    const b = document.createElement('button');
    b.innerHTML = `<span>${it.icon || ''}</span>${esc(it.label)}`;
    if (it.danger) b.className = 'danger';
    b.onclick = e => { e.stopPropagation(); closeMenu(); it.act(); };
    m.append(b);
  });
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - mw - 8, r.right - mw)) + 'px';
  m.style.top = (r.bottom + mh + 8 > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
  openMenu = m;
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
}
function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }

function confetti(n = 60) {
  const colors = ['#7c5cff', '#ff5c8a', '#ffd36e', '#6ee7c5', '#5cc8ff', '#ff9a5c'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * .3 + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.append(c);
    setTimeout(() => c.remove(), 3800);
  }
}

function setTheme(t) { try { localStorage.setItem('corcho_theme', t); } catch {} document.documentElement.dataset.theme = t; }
try { const t = localStorage.getItem('corcho_theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
const toggleTheme = () => { const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); setTheme(dark ? 'light' : 'dark'); };

const localBanner = () => api.mode === 'local' ? `<div class="banner-local">🧪 <b>Modo demo local:</b> los datos se guardan solo en este navegador. Subí la app a Netlify para compartir de verdad.</div>` : '';

// ======================= router =======================
function stopBoard() { clearInterval(S.timer); S.timer = null; S.unsub && S.unsub(); S.unsub = null; if (S.map) { S.map.remove(); S.map = null; S.markers = {}; } $$('.drawer').forEach(d => d.remove()); }

async function route() {
  stopBoard(); closeMenu();
  $$('.overlay,.slides').forEach(o => o.remove());
  const [, kind, id] = location.hash.replace(/^#\/?/, '#/').split('/');
  if (kind === 'b' && id) return showBoard(id);
  if (kind === 'c' && id) return showCourse(id);
  if (me.key) {
    try { S.index = await api.index(); return renderDash(); } catch (e) { if (e.status === 401) me.key = ''; else { toast(e.message, true); } }
  }
  showLanding();
}
addEventListener('hashchange', route);

// ======================= landing / login =======================
async function showLanding() {
  document.title = 'Corcho · muros colaborativos';
  const setup = await run(() => api.setup()) || {};
  $app.innerHTML = `${localBanner()}<div class="landing"><div class="landing-card">
    <div>
      <div class="logo" style="padding-left:0"><span class="pin">📌</span>Corcho</div>
      <h1>Todos tus muros,<br><span>todos tus cursos.</span></h1>
      <p class="lead">Creá muros colaborativos, compartilos con un enlace o QR y replicalos en cada curso con un clic. Tus estudiantes publican texto, fotos, audios, dibujos, videos y encuestas — sin cuenta.</p>
      <div class="feature-list">
        ${['🧱 7 formatos', '🎙️ Audio', '✏️ Dibujo', '📊 Encuestas', '🗺️ Mapa', '⏳ Línea de tiempo', '🛡️ Moderación', '▶ Modo presentación', '📋 Plantillas', '🔁 Replicar en cursos'].map(f => `<span class="chip">${f}</span>`).join('')}
      </div>
      <div class="mini-board">
        <div class="note" style="background:#fff3a3;left:4%;top:10px;--r:-4deg;transform:rotate(-4deg)">¡Mi idea es hacer una maqueta! 🏗️</div>
        <div class="note" style="background:#ffc9de;left:34%;top:40px;--r:3deg;transform:rotate(3deg);animation-delay:.6s">¿Por qué el cielo es azul? 🤔</div>
        <div class="note" style="background:#c3e3ff;left:64%;top:4px;--r:-2deg;transform:rotate(-2deg);animation-delay:1.2s">Aprendí fracciones con pizza 🍕</div>
        <div class="note" style="background:#c8f2c2;left:20%;top:120px;--r:2deg;transform:rotate(2deg);animation-delay:.3s">❤️ 12 &nbsp; 💬 4</div>
        <div class="note" style="background:#dccfff;left:54%;top:118px;--r:-3deg;transform:rotate(-3deg);animation-delay:.9s">🎙️ audio 0:42</div>
      </div>
    </div>
    <div class="login-box">
      <h2>${setup.configured ? 'Entrar como docente' : 'Crear acceso docente'}</h2>
      <p class="muted" style="margin:0;font-size:14px">${setup.configured ? 'Ingresá tu contraseña para administrar cursos y muros.' : 'Es la primera vez: elegí una contraseña. Con ella vas a administrar todos tus cursos.'}</p>
      <input type="password" id="pw" placeholder="Contraseña" autocomplete="current-password">
      <button class="btn primary" id="loginBtn" style="justify-content:center;padding:12px">${setup.configured ? 'Entrar' : 'Crear y entrar'} →</button>
      <div class="divider">¿Sos estudiante?</div>
      <div class="row"><input type="text" id="code" placeholder="Pegá el enlace o código del muro"><button class="btn" id="goBtn">Ir</button></div>
      <button class="btn ghost sm" id="themeBtn" style="justify-self:start">🌓 Cambiar tema</button>
    </div>
  </div></div>`;
  const login = () => run(async () => {
    const pw = $('#pw').value;
    const r = await api.login(pw);
    me.key = pw;
    if (r.created) toast('¡Listo! Acceso docente creado 🎉');
    S.index = await api.index();
    renderDash();
  });
  $('#loginBtn').onclick = login;
  $('#pw').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); login(); } };
  const go = () => { const v = $('#code').value.trim(); const m = v.match(/#\/(b|c)\/([\w]+)/); location.hash = m ? `#/${m[1]}/${m[2]}` : `#/b/${v}`; };
  $('#goBtn').onclick = go;
  $('#code').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  $('#themeBtn').onclick = toggleTheme;
}

// ======================= dashboard =======================
function renderDash() {
  document.title = 'Corcho · mis cursos';
  const ix = S.index;
  if (!S.courseId || !ix.courses.some(c => c.id === S.courseId)) S.courseId = ix.courses[0]?.id || null;
  const course = ix.courses.find(c => c.id === S.courseId);
  const boards = ix.boards.filter(b => b.courseId === S.courseId).sort((a, b) => b.createdAt - a.createdAt);
  const layoutName = id => LAYOUTS.find(l => l.id === id)?.name || id;

  $app.innerHTML = `${localBanner()}
  <div class="mobile-top"><button class="btn icon ghost" id="openSide">☰</button><div class="logo" style="padding:0;font-size:19px"><span class="pin">📌</span>Corcho</div></div>
  <div class="dash">
    <aside class="side" id="side">
      <div class="logo"><span class="pin">📌</span>Corcho</div>
      <button class="btn primary" id="newBoard" ${course ? '' : 'disabled'} style="justify-content:center">＋ Nuevo muro</button>
      <h4>Mis cursos</h4>
      ${ix.courses.map(c => `<button class="course-item ${c.id === S.courseId ? 'active' : ''}" style="--c:${esc(c.color)}" data-course="${c.id}"><span class="em">${esc(c.emoji)}</span><span class="grow" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span><span class="n">${ix.boards.filter(b => b.courseId === c.id).length}</span></button>`).join('')}
      <button class="course-item" id="newCourse"><span class="em" style="background:var(--panel-2)">＋</span>Nuevo curso</button>
      <div class="spacer"></div>
      <button class="course-item" id="theme"><span class="em" style="background:var(--panel-2)">🌓</span>Tema claro / oscuro</button>
      <button class="course-item" id="logout"><span class="em" style="background:var(--panel-2)">🚪</span>Cerrar sesión</button>
    </aside>
    <main class="main">
      ${course ? `
      <div class="course-head" style="--c:${esc(course.color)}">
        <div class="big-em">${esc(course.emoji)}</div>
        <div class="grow"><h1>${esc(course.name)}</h1><div class="muted">${boards.length} muro${boards.length === 1 ? '' : 's'}</div></div>
        <button class="btn" id="shareCourse">🔗 Compartir curso</button>
        <button class="btn" id="cloneCourse">🧬 Replicar curso</button>
        <button class="btn icon" id="courseMenu">⋯</button>
      </div>
      <div class="boards-grid">
        <div class="board-card new" id="newBoard2"><div><span class="plus">＋</span>Nuevo muro<br><small class="muted" style="font-weight:500">desde una plantilla</small></div></div>
        ${boards.map(b => { const w = wpStyle(b.wallpaper); return `
          <div class="board-card" data-board="${b.id}">
            <div class="cover" style="${w.style}"><span>${esc(b.emoji)}</span><span class="lay">${LAYOUTS.find(l => l.id === b.layout)?.icon || ''} ${esc(layoutName(b.layout))}</span></div>
            <button class="menu-btn" data-bmenu="${b.id}" aria-label="Opciones">⋯</button>
            <div class="body"><h3>${esc(b.title)}</h3><p>${esc(b.description || 'Sin descripción')}</p></div>
          </div>`; }).join('')}
      </div>` : `
      <div class="empty"><div class="big">🎒</div><h2>Creá tu primer curso</h2><p>Un curso agrupa muros (por ejemplo “4° A — Matemática”). Después podés replicar todo en otros cursos.</p><button class="btn primary" id="firstCourse">＋ Crear curso</button></div>`}
    </main>
  </div>`;

  $('#openSide').onclick = e => { e.stopPropagation(); $('#side').classList.toggle('open'); };
  $('.main').onclick = () => $('#side').classList.remove('open');
  $$('[data-course]').forEach(b => b.onclick = () => { S.courseId = b.dataset.course; renderDash(); });
  $('#newCourse').onclick = () => courseDialog();
  $('#firstCourse') && ($('#firstCourse').onclick = () => courseDialog());
  $('#theme').onclick = toggleTheme;
  $('#logout').onclick = () => { me.key = ''; S.index = null; route(); };
  if (course) {
    $('#newBoard').onclick = $('#newBoard2').onclick = () => newBoardDialog(course.id);
    $('#shareCourse').onclick = () => shareDialog(courseUrl(course.id), `${course.emoji} ${course.name}`, 'Los estudiantes ven todos los muros visibles de este curso.');
    $('#cloneCourse').onclick = () => cloneCourseDialog(course);
    $('#courseMenu').onclick = e => { e.stopPropagation(); menu(e.currentTarget, [
      { icon: '✏️', label: 'Editar curso', act: () => courseDialog(course) },
      { icon: '👀', label: 'Ver como estudiante', act: () => (location.hash = `#/c/${course.id}`) },
      '-',
      { icon: '🗑️', label: 'Eliminar curso', danger: true, act: async () => { if (await ask('Eliminar curso', `Se borrarán <b>${esc(course.name)}</b> y sus ${boards.length} muros. No se puede deshacer.`, 'Eliminar', true)) adminDo({ type: 'deleteCourse', id: course.id }, 'Curso eliminado'); } },
    ]); };
  }
  $$('[data-board]').forEach(c => c.onclick = e => { if (!e.target.closest('[data-bmenu]')) location.hash = `#/b/${c.dataset.board}`; });
  $$('[data-bmenu]').forEach(btn => btn.onclick = e => { e.stopPropagation(); boardCardMenu(btn, ix.boards.find(b => b.id === btn.dataset.bmenu)); });
}

async function adminDo(op, msg) {
  const r = await run(() => api.admin(op));
  if (r) { S.index = r.index; if (msg) toast(msg); renderDash(); }
  return r?.result;
}

function boardCardMenu(anchor, b) {
  menu(anchor, [
    { icon: '↗️', label: 'Abrir', act: () => (location.hash = `#/b/${b.id}`) },
    { icon: '🔗', label: 'Compartir / QR', act: () => shareDialog(boardUrl(b.id), `${b.emoji} ${b.title}`) },
    { icon: '🔁', label: 'Replicar en otros cursos…', act: () => replicateDialog(b) },
    { icon: '📄', label: 'Duplicar aquí', act: () => adminDo({ type: 'duplicateBoard', id: b.id, courseIds: [b.courseId], withPosts: false }, 'Muro duplicado') },
    { icon: '📦', label: 'Mover a otro curso…', act: () => moveBoardDialog(b) },
    '-',
    { icon: '🗑️', label: 'Eliminar', danger: true, act: async () => { if (await ask('Eliminar muro', `¿Borrar <b>${esc(b.title)}</b> con todas sus publicaciones?`, 'Eliminar', true)) adminDo({ type: 'deleteBoard', id: b.id }, 'Muro eliminado'); } },
  ]);
}

const COURSE_EMOJIS = ['🎒', '📐', '🧪', '🌎', '📚', '💻', '🎨', '🎵', '⚽', '🔬', '🧮', '🤖', '🏛️', '🌱', '🗣️', '✍️'];
const COURSE_COLORS = ['#7c5cff', '#ff5c8a', '#ff9a3c', '#f5c400', '#20b26b', '#12a8c9', '#3d6bff', '#a14cff', '#e5484d', '#6b7280'];
function courseDialog(c = null) {
  let emoji = c?.emoji || COURSE_EMOJIS[S.index.courses.length % COURSE_EMOJIS.length], color = c?.color || COURSE_COLORS[S.index.courses.length % COURSE_COLORS.length];
  const m = modal({ title: c ? 'Editar curso' : 'Nuevo curso', body: `
    <label class="field">Nombre<input type="text" id="cn" value="${esc(c?.name || '')}" placeholder="Ej: 4° A — Matemática" maxlength="80"></label>
    <div class="field">Ícono<div class="swatches" id="ce">${COURSE_EMOJIS.map(e => `<button class="sw ${e === emoji ? 'sel' : ''}" data-e="${e}" style="background:var(--panel-2);font-size:17px">${e}</button>`).join('')}</div></div>
    <div class="field">Color<div class="swatches" id="cc">${COURSE_COLORS.map(x => `<button class="sw ${x === color ? 'sel' : ''}" data-c="${x}" style="background:${x}"></button>`).join('')}</div></div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cs">${c ? 'Guardar' : 'Crear curso'}</button>` });
  $$('[data-e]', m.el).forEach(b => b.onclick = () => { emoji = b.dataset.e; $$('[data-e]', m.el).forEach(x => x.classList.toggle('sel', x === b)); });
  $$('[data-c]', m.el).forEach(b => b.onclick = () => { color = b.dataset.c; $$('[data-c]', m.el).forEach(x => x.classList.toggle('sel', x === b)); });
  const save = async () => {
    const name = $('#cn', m.el).value.trim(); if (!name) return toast('Poné un nombre', true);
    m.close();
    if (c) await adminDo({ type: 'updateCourse', id: c.id, name, emoji, color }, 'Curso actualizado');
    else { const nc = await adminDo({ type: 'createCourse', name, emoji, color }, 'Curso creado 🎒'); if (nc) { S.courseId = nc.id; renderDash(); } }
  };
  $('#cs', m.el).onclick = save;
  $('#cn', m.el).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); save(); } };
}

function newBoardDialog(courseId) {
  let tpl = 'blank';
  const m = modal({ title: 'Nuevo muro', wide: true, body: `
    <div class="tpl-grid">${TEMPLATES.map(t => { const w = wpStyle(t.wallpaper); return `<button class="tpl ${t.id === tpl ? 'sel' : ''}" data-t="${t.id}"><div class="cv" style="${w.style}">${t.emoji}</div><div class="tx"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></div></button>`; }).join('')}</div>
    <div class="row" style="flex-wrap:wrap">
      <label class="field grow">Título<input type="text" id="bt" placeholder="Muro en blanco" maxlength="120"></label>
      <label class="field" style="min-width:200px">Curso<select id="bc">${S.index.courses.map(c => `<option value="${c.id}" ${c.id === courseId ? 'selected' : ''}>${esc(c.emoji + ' ' + c.name)}</option>`).join('')}</select></label>
    </div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="bs">Crear muro ✨</button>` });
  const pick = id => { tpl = id; $$('.tpl', m.el).forEach(x => x.style.borderColor = x.dataset.t === id ? 'var(--brand)' : ''); $('#bt', m.el).placeholder = TEMPLATES.find(t => t.id === id).title || 'Muro en blanco'; };
  $$('.tpl', m.el).forEach(b => b.onclick = () => pick(b.dataset.t));
  pick('blank');
  $('#bs', m.el).onclick = async () => {
    const title = $('#bt', m.el).value.trim() || undefined;
    m.close();
    const id = await adminDo({ type: 'createBoard', template: tpl, title, courseId: $('#bc', m.el).value });
    if (id) { confetti(40); location.hash = `#/b/${id}`; }
  };
}

function replicateDialog(b) {
  const others = S.index.courses.filter(c => c.id !== b.courseId);
  if (!others.length) return toast('Primero creá otro curso para replicar', true);
  const m = modal({ title: '🔁 Replicar muro en otros cursos', body: `
    <p class="muted" style="margin:0">Se crea una copia independiente de <b>${esc(b.title)}</b> (mismo diseño, secciones y configuración) en cada curso que elijas.</p>
    <div class="row"><button class="btn sm" id="all">Seleccionar todos</button></div>
    <div class="check-list">${others.map(c => `<label><input type="checkbox" value="${c.id}"> ${esc(c.emoji)} ${esc(c.name)}</label>`).join('')}</div>
    <label class="switch"><span>Copiar también las publicaciones<small>Útil para consignas o material ya cargado</small></span><input type="checkbox" id="wp"></label>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="go">Replicar</button>` });
  $('#all', m.el).onclick = () => $$('.check-list input', m.el).forEach(i => (i.checked = true));
  $('#go', m.el).onclick = async () => {
    const ids = $$('.check-list input:checked', m.el).map(i => i.value);
    if (!ids.length) return toast('Elegí al menos un curso', true);
    m.close();
    const r = await adminDo({ type: 'duplicateBoard', id: b.id, courseIds: ids, withPosts: $('#wp', m.el).checked });
    if (r) { confetti(50); toast(`Replicado en ${ids.length} curso${ids.length > 1 ? 's' : ''} 🎉`); }
  };
}

function moveBoardDialog(b) {
  const m = modal({ title: 'Mover muro', body: `<label class="field">Curso destino<select id="mc">${S.index.courses.map(c => `<option value="${c.id}" ${c.id === b.courseId ? 'selected' : ''}>${esc(c.emoji + ' ' + c.name)}</option>`).join('')}</select></label>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="go">Mover</button>` });
  $('#go', m.el).onclick = () => { const cid = $('#mc', m.el).value; m.close(); if (cid !== b.courseId) adminDo({ type: 'moveBoard', id: b.id, courseId: cid }, 'Muro movido'); };
}

function cloneCourseDialog(course) {
  const m = modal({ title: '🧬 Replicar curso completo', body: `
    <p class="muted" style="margin:0">Crea cursos nuevos con <b>todos los muros</b> de <b>${esc(course.emoji)} ${esc(course.name)}</b>. Ideal para dar la misma materia en varias divisiones.</p>
    <label class="field">Nombres de los cursos nuevos (uno por línea)<textarea id="names" placeholder="4° B — Matemática&#10;4° C — Matemática"></textarea></label>
    <label class="switch"><span>Copiar también las publicaciones</span><input type="checkbox" id="wp"></label>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="go">Crear cursos</button>` });
  $('#go', m.el).onclick = async () => {
    const names = $('#names', m.el).value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return toast('Escribí al menos un nombre', true);
    m.close();
    const r = await adminDo({ type: 'cloneCourse', id: course.id, names, withPosts: $('#wp', m.el).checked });
    if (r) { confetti(70); toast(`${names.length} curso${names.length > 1 ? 's' : ''} creado${names.length > 1 ? 's' : ''} 🎉`); }
  };
}

function shareDialog(url, title, note = 'Cualquiera con el enlace puede ver y participar (sin cuenta).') {
  const m = modal({ title: 'Compartir', body: `
    <div style="font-weight:700;font-size:17px">${esc(title)}</div>
    <div class="share-url"><input type="text" readonly value="${esc(url)}"><button class="btn primary" id="cp">Copiar</button></div>
    <p class="muted" style="margin:0;font-size:13px">${esc(note)}</p>
    <div class="qr-box"><div id="qr"></div></div>
    <div class="row" style="justify-content:center;flex-wrap:wrap">
      <button class="btn sm" id="dl">⬇️ Descargar QR</button>
      <button class="btn sm" id="big">📽️ QR gigante</button>
      ${navigator.share ? '<button class="btn sm" id="ns">📤 Enviar…</button>' : ''}
      <a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}">💬 WhatsApp</a>
    </div>` });
  const mkQR = (el, size) => { if (window.QRCode) new QRCode(el, { text: url, width: size, height: size, correctLevel: QRCode.CorrectLevel.M }); else el.textContent = 'QR no disponible sin conexión'; };
  mkQR($('#qr', m.el), 220);
  $('#cp', m.el).onclick = async () => { try { await navigator.clipboard.writeText(url); } catch { $('input', m.el).select(); document.execCommand('copy'); } toast('Enlace copiado 📋'); };
  $('#dl', m.el).onclick = () => { const c = $('#qr canvas', m.el); if (!c) return; const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'qr-corcho.png'; a.click(); };
  $('#big', m.el).onclick = () => {
    const ov = document.createElement('div'); ov.className = 'overlay'; ov.style.background = '#fff'; ov.style.zIndex = 1600;
    ov.innerHTML = `<div style="text-align:center;color:#111"><div id="qrb" style="display:inline-block"></div><h1 style="font-size:clamp(20px,4vw,40px);margin:20px 0 6px">${esc(title)}</h1><p style="font-family:'Space Mono',monospace;font-size:clamp(12px,2vw,20px);margin:0">${esc(url)}</p><p style="color:#888">Tocá para cerrar</p></div>`;
    ov.onclick = () => ov.remove(); document.body.append(ov); mkQR($('#qrb', ov), Math.min(innerWidth, innerHeight) * .62);
  };
  $('#ns', m.el) && ($('#ns', m.el).onclick = () => navigator.share({ title, url }).catch(() => {}));
}

// ======================= página pública de curso =======================
async function showCourse(id) {
  $app.innerHTML = `<div class="boot"><div class="boot-pin">📌</div></div>`;
  const r = await run(() => api.course(id));
  if (!r) { $app.innerHTML = `<div class="empty"><div class="big">🤷</div><h2>No encontramos este curso</h2><a href="#/">Volver al inicio</a></div>`; return; }
  const { course, boards } = r;
  document.title = `${course.name} · Corcho`;
  $app.innerHTML = `${localBanner()}<div class="main" style="max-width:1100px;margin:0 auto">
    <div class="course-head" style="--c:${esc(course.color)}">
      ${me.key ? `<button class="btn icon ghost" onclick="location.hash='#/'">←</button>` : ''}
      <div class="big-em">${esc(course.emoji)}</div>
      <div class="grow"><h1>${esc(course.name)}</h1><div class="muted">Elegí un muro para participar</div></div>
      <button class="btn icon ghost" id="th">🌓</button>
    </div>
    ${boards.length ? `<div class="boards-grid">${boards.sort((a, b) => b.createdAt - a.createdAt).map(b => { const w = wpStyle(b.wallpaper); return `<a class="board-card" href="#/b/${b.id}" style="text-decoration:none;color:inherit"><div class="cover" style="${w.style}"><span>${esc(b.emoji)}</span><span class="lay">${esc(LAYOUTS.find(l => l.id === b.layout)?.name || '')}</span></div><div class="body"><h3>${esc(b.title)}</h3><p>${esc(b.description || '')}</p></div></a>`; }).join('')}</div>` : `<div class="empty"><div class="big">🌱</div><p>Todavía no hay muros publicados.</p></div>`}
  </div>`;
  $('#th').onclick = toggleTheme;
}

// ======================= muro =======================
async function showBoard(id) {
  $app.innerHTML = `<div class="boot"><div class="boot-pin">📌</div><p>Abriendo muro…</p></div>`;
  S.seen = new Set(); S.boardSig = ''; S.search = ''; S.zoom = 1;
  const b = await run(() => api.board(id));
  if (!b) { $app.innerHTML = `<div class="empty" style="padding-top:20vh"><div class="big">🕳️</div><h2>Este muro no existe</h2><p>Puede que lo hayan eliminado o el enlace esté incompleto.</p><a class="btn" href="#/">Ir al inicio</a></div>`; return; }
  if (me.key && !S.index) S.index = await api.index().catch(() => null);
  S.board = b;
  renderBoard();
  const poll = async () => {
    if (document.hidden || S.dragging || !S.board || S.board.id !== id) return;
    try { const r = await api.board(id, S.board.v); if (!r.same) applyBoard(r); } catch (e) { if (e.status === 404) { toast('El muro fue eliminado', true); stopBoard(); } }
  };
  S.timer = setInterval(poll, api.mode === 'local' ? 2000 : 3000);
  S.unsub = api.subscribe(poll);
}

const sig = b => JSON.stringify([b.title, b.description, b.emoji, b.layout, b.wallpaper, b.font, b.cardStyle, b.settings, b.sections, b.admin]);
function applyBoard(nb) {
  const old = S.board; S.board = nb;
  if (!old || sig(old) !== sig(nb)) renderBoard(); else renderArea();
}
async function op(o, okMsg) {
  const r = await run(() => api.op(S.board.id, o));
  if (r) { applyBoard(r.board); if (okMsg) toast(okMsg); }
  return r?.result;
}

function canMove(p) { const b = S.board; return (b.admin || b.settings.allowMove || p.mine) && (!b.settings.locked || b.admin); }
function canPost() { return !S.board.settings.locked || S.board.admin; }

function renderBoard() {
  const b = S.board;
  const w = wpStyle(b.wallpaper);
  const font = FONTS.find(f => f.id === b.font) || FONTS[0];
  const course = S.index?.courses.find(c => c.id === b.courseId);
  document.title = `${b.emoji} ${b.title} · Corcho`;
  const scroll = scrollY;
  if (S.map) { S.map.remove(); S.map = null; S.markers = {}; }
  $app.innerHTML = `${localBanner()}
  <div class="board-page cs-${b.cardStyle} ${w.dark ? 'dark-wp' : ''}" style="${w.style}--card-font:${font.css}" id="bp">
    <header class="board-top">
      ${b.admin ? `<button class="btn icon ghost" data-act="back" title="Mis cursos">←</button>` : ''}
      <div class="ttl grow"><span class="em">${esc(b.emoji)}</span><div style="min-width:0">${course ? `<a class="crumb" href="#/">${esc(course.emoji + ' ' + course.name)}</a>` : ''}<h1>${esc(b.title)}</h1></div></div>
      ${b.settings.locked ? '<span class="chip">🔒 Bloqueado</span>' : '<span class="live hide-m">En vivo</span>'}
      <button class="btn sm" data-act="share">🔗<span class="hide-m"> Compartir</span></button>
      <button class="btn sm hide-m" data-act="slides">▶ Presentar</button>
      ${b.admin ? '<button class="btn icon" data-act="settings" title="Configurar">⚙️</button>' : ''}
      <button class="btn icon" data-act="boardmenu" title="Más">⋯</button>
    </header>
    ${b.description ? `<div class="board-desc">${md(b.description)}</div>` : ''}
    ${b.layout !== 'map' ? `<div class="board-tools">
      <input type="search" id="q" placeholder="🔍 Buscar…" value="${esc(S.search)}">
      <select id="sort">
        <option value="new">🕒 Más recientes</option><option value="old">🕰️ Más antiguas</option>
        ${b.settings.reactions !== 'none' ? '<option value="top">🔥 Más valoradas</option>' : ''}
        <option value="az">🔤 A → Z</option><option value="color">🎨 Por color</option>
      </select>
      <span class="chip" id="count"></span>
    </div>` : ''}
    <div id="pending"></div>
    <main class="board-area" id="area"></main>
    ${canPost() ? `<button class="fab" data-act="new" title="Nueva publicación" aria-label="Nueva publicación">＋</button>` : ''}
  </div>`;
  const q = $('#q'); if (q) q.oninput = () => { S.search = q.value.toLowerCase(); renderArea(); };
  const so = $('#sort'); if (so) { so.value = S.sort; so.onchange = () => { S.sort = so.value; renderArea(); }; }
  $('#bp').addEventListener('click', onBoardClick);
  renderArea();
  scrollTo(0, scroll);
}

function sortPosts(list) {
  const b = S.board;
  const score = p => { const r = p.react || {}; if (b.settings.reactions === 'like') return r.count || 0; if (b.settings.reactions === 'vote') return r.score || 0; if (b.settings.reactions === 'star') return (r.avg || 0) * 100 + (r.n || 0); if (b.settings.reactions === 'emoji') return Object.values(r.counts || {}).reduce((a, c) => a + c, 0); return (p.comments || []).length; };
  const fns = { new: (a, b2) => b2.createdAt - a.createdAt, old: (a, b2) => a.createdAt - b2.createdAt, top: (a, b2) => score(b2) - score(a), az: (a, b2) => (a.title || a.body).localeCompare(b2.title || b2.body, 'es'), color: (a, b2) => CARD_COLORS.findIndex(c => c.id === a.color) - CARD_COLORS.findIndex(c => c.id === b2.color) };
  return [...list].sort((a, b2) => (b2.pinned - a.pinned) || fns[S.sort in fns ? S.sort : 'new'](a, b2));
}
function visiblePosts() {
  const q = S.search;
  const list = S.board.posts.filter(p => !q || [p.title, p.body, p.author, p.attach?.name, p.poll?.question].join(' ').toLowerCase().includes(q));
  return sortPosts(list);
}

function renderArea() {
  const b = S.board; const area = $('#area'); if (!area) return;
  const posts = visiblePosts();
  const pending = b.posts.filter(p => p.approved === false);
  const pend = $('#pending');
  if (pend) pend.innerHTML = b.admin && pending.length ? `<div class="pending-bar">⏳ <b>${pending.length}</b> ${pending.length > 1 ? 'publicaciones' : 'publicación'} esperando aprobación <span class="spacer"></span><button class="btn sm" data-act="approveAll">Aprobar todas</button></div>` : (!b.admin && pending.some(p => p.mine) ? `<div class="pending-bar">⏳ Tu publicación se verá cuando el docente la apruebe.</div>` : '');
  const cnt = $('#count'); if (cnt) cnt.textContent = `${posts.length} ${posts.length === 1 ? 'publicación' : 'publicaciones'}`;

  // preservar scroll de contenedores internos
  const scroller = $('.L-columns,.L-canvas-wrap,.L-timeline', area);
  const sx = scroller?.scrollLeft, sy = scroller?.scrollTop;

  if (b.layout === 'map') return renderMap(area, posts);
  if (b.layout === 'columns') {
    area.innerHTML = `<div class="L-columns">${b.sections.map(s => {
      const ps = posts.filter(p => p.sectionId === s.id);
      if (S.sort === 'new' && !S.search) ps.sort((x, y) => (y.pinned - x.pinned) || (x.order || 0) - (y.order || 0));
      return `<section class="col"><div class="col-head"><span class="grow">${esc(s.title)}</span><span class="count">${ps.length}</span></div>
        <div class="col-drop" data-sec="${s.id}">${ps.map(cardHTML).join('')}</div>
        ${canPost() ? `<button class="add-here" data-act="new" data-sec="${s.id}">＋ Agregar</button>` : ''}</section>`;
    }).join('')}</div>`;
    setupColumnDnD(area);
  } else if (b.layout === 'canvas') {
    area.innerHTML = `<div class="L-canvas-wrap"><div class="L-canvas" style="transform:scale(${S.zoom})">${posts.map(cardHTML).join('')}</div></div>
      <div class="zoom"><button class="btn sm ghost" data-act="zoom" data-z="-1">−</button><button class="btn sm ghost" data-act="zoom" data-z="0">${Math.round(S.zoom * 100)}%</button><button class="btn sm ghost" data-act="zoom" data-z="1">＋</button></div>`;
    setupCanvas(area);
  } else if (b.layout === 'timeline') {
    const dt = p => p.date ? new Date(p.date + 'T12:00:00').getTime() : p.createdAt;
    const sorted = [...posts].sort((x, y) => dt(x) - dt(y));
    area.innerHTML = sorted.length ? `<div class="L-timeline">${sorted.map(p => `<div class="tl-item"><div class="tl-date">${new Date(dt(p)).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</div>${cardHTML(p)}</div>`).join('')}</div>` : emptyHTML();
  } else {
    area.innerHTML = posts.length ? `<div class="L-${b.layout}">${posts.map(cardHTML).join('')}</div>` : emptyHTML();
  }
  const sc2 = $('.L-columns,.L-canvas-wrap,.L-timeline', area);
  if (sc2 && sx != null) { sc2.scrollLeft = sx; sc2.scrollTop = sy; }
}
const emptyHTML = () => `<div class="empty" style="color:var(--wp-ink)"><div class="big">${S.search ? '🔍' : '✨'}</div><h2 style="margin:6px 0">${S.search ? 'Sin resultados' : 'El muro está esperando ideas'}</h2>${!S.search && canPost() ? '<p>Tocá el botón <b>＋</b> para publicar la primera.</p>' : ''}</div>`;

function attachHTML(a, full = false) {
  if (!a) return '';
  const u = esc(a.url);
  if (a.kind === 'image' || a.kind === 'draw') return `<div class="media ${a.kind}"><img src="${u}" alt="${esc(a.name || 'imagen')}" loading="lazy"></div>`;
  if (a.kind === 'audio') return `<div class="media"><audio controls preload="none" src="${u}"></audio></div>`;
  if (a.kind === 'video') { const src = embedSrc(a.url); return src ? `<div class="media"><iframe src="${esc(src)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>` : `<div class="media"><video controls src="${u}" style="width:100%"></video></div>`; }
  if (a.kind === 'file') {
    const isPdf = /pdf/.test(a.mime || '') || /\.pdf$/i.test(a.name || '');
    return (full && isPdf ? `<div class="media"><iframe src="${u}" style="aspect-ratio:3/4"></iframe></div>` : '') + `<a class="link-card" href="${u}" target="_blank" rel="noopener" download="${esc(a.name || '')}"><span style="font-size:22px">${isPdf ? '📕' : '📎'}</span><div><b>${esc(a.name || 'Archivo')}</b><small>Descargar archivo</small></div></a>`;
  }
  return `<a class="link-card" href="${u}" target="_blank" rel="noopener"><img src="https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostOf(a.url))}" alt=""><div><b>${esc(a.name || hostOf(a.url))}</b><small>${esc(a.url)}</small></div></a>`;
}

function reactHTML(p) {
  const b = S.board, r = p.react || {}, mode = b.settings.reactions;
  let h = '';
  if (mode === 'like') h += `<button class="r-btn ${r.mine ? 'on' : ''}" data-act="like">${r.mine ? '❤️' : '🤍'} ${r.count || ''}</button>`;
  if (mode === 'vote') h += `<button class="r-btn ${r.mine === 1 ? 'on' : ''}" data-act="vote" data-v="1">👍 ${r.up || ''}</button><button class="r-btn ${r.mine === -1 ? 'on' : ''}" data-act="vote" data-v="-1">👎 ${r.down || ''}</button>`;
  if (mode === 'star') { const show = r.mine || Math.round(r.avg || 0); h += `<span class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="${n <= show ? 'on' : ''}" data-act="star" data-v="${n}" title="${n} estrella${n > 1 ? 's' : ''}">⭐</button>`).join('')}</span>${r.n ? `<span style="opacity:.7;font-weight:700">${(r.avg || 0).toFixed(1)} · ${r.n}</span>` : ''}`; }
  if (mode === 'emoji') { const counts = r.counts || {}; h += Object.entries(counts).map(([e, n]) => `<button class="r-btn ${r.mine?.includes(e) ? 'on' : ''}" data-act="emoji" data-v="${e}">${e} ${n}</button>`).join('') + `<button class="r-btn" data-act="emojiPick" title="Reaccionar">😀＋</button>`; }
  if (b.settings.comments) h += `<button class="r-btn" data-act="open">💬 ${p.comments.length || ''}</button>`;
  if (p.grade) h += `<span class="grade" title="Nota">${esc(p.grade)}</span>`;
  else if (mode === 'grade' && b.admin) h += `<button class="r-btn" data-act="grade" style="margin-left:auto">💯 Calificar</button>`;
  return h;
}

function cardHTML(p, opts = {}) {
  const b = S.board, c = colorOf(p.color);
  const fresh = !S.seen.has(p.id) && !opts.static; S.seen.add(p.id);
  const pos = b.layout === 'canvas' && !opts.static ? `left:${p.x}px;top:${p.y}px;` : '';
  const showWho = p.author || p.mine;
  const who = p.author || (p.mine ? 'Vos' : '');
  return `<article class="card ${fresh ? 'fresh' : ''} ${p.approved === false ? 'pending' : ''} ${p.pinned ? 'pinned' : ''}" data-id="${p.id}" style="--cbg:${c.bg};--cfg:${c.fg};${pos}" ${b.layout === 'columns' && canMove(p) && !opts.static ? 'draggable="true"' : ''}>
    <div class="grip">${showWho ? `<span class="av" style="background:${avColor(who)}">${esc(initials(who))}</span><span class="who">${esc(who)}${p.byAdmin ? ' 🎓' : ''}</span>` : '<span class="who">·</span>'}<span>· ${timeAgo(p.createdAt)}</span>${p.approved === false ? '<span class="meta-chip">pendiente</span>' : ''}${opts.static ? '' : '<button class="more" data-act="more" aria-label="Opciones">⋯</button>'}</div>
    <div class="c-body" data-act="${opts.static ? '' : 'open'}">
      ${p.title ? `<h3>${esc(p.title)}</h3>` : ''}
      ${p.body ? `<div class="txt">${md(p.body)}</div>` : ''}
      ${attachHTML(p.attach, opts.full)}
      ${p.poll ? pollHTML(p) : ''}
      ${b.layout !== 'timeline' && p.date ? `<span class="meta-chip">📅 ${esc(new Date(p.date + 'T12:00:00').toLocaleDateString('es-AR'))}</span>` : ''}
    </div>
    <div class="c-foot">${reactHTML(p)}</div>
    ${b.admin && p.approved === false ? `<div class="approve-row"><button class="btn sm primary" data-act="approve">✓ Aprobar</button><button class="btn sm danger" data-act="del">✕ Rechazar</button></div>` : ''}
  </article>`;
}
function pollHTML(p) {
  const total = p.poll.options.reduce((a, o) => a + o.n, 0) || 0;
  return `<div class="poll">${p.poll.question ? `<b>${esc(p.poll.question)}</b>` : ''}${p.poll.options.map(o => { const pct = total ? Math.round(o.n * 100 / total) : 0; return `<button class="${o.mine ? 'mine' : ''}" data-act="pollVote" data-opt="${o.id}"><div class="bar" style="width:${pct}%"></div><span><span>${o.mine ? '✅ ' : ''}${esc(o.text)}</span><span>${pct}%</span></span></button>`; }).join('')}<small style="opacity:.7">${total} voto${total === 1 ? '' : 's'}</small></div>`;
}

// ---------- eventos del muro ----------
function onBoardClick(e) {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act; if (!act) return;
  const card = t.closest('[data-id]'); const p = card && S.board.posts.find(x => x.id === card.dataset.id);
  const b = S.board;
  if (e.target.closest('a,audio,iframe,video') && act === 'open') return;
  switch (act) {
    case 'back': location.hash = '#/'; break;
    case 'new': composer({ sectionId: t.dataset.sec }); break;
    case 'share': shareDialog(boardUrl(b.id), `${b.emoji} ${b.title}`); break;
    case 'slides': slideshow(); break;
    case 'settings': settingsDrawer(); break;
    case 'boardmenu': e.stopPropagation(); boardMenu(t); break;
    case 'approveAll': op({ type: 'approveAll' }, 'Todo aprobado ✓'); break;
    case 'zoom': { const z = +t.dataset.z; S.zoom = z === 0 ? 1 : Math.max(.3, Math.min(1.6, S.zoom + z * .15)); renderArea(); break; }
    case 'open': if (p) postView(p.id); break;
    case 'more': e.stopPropagation(); if (p) postMenu(t, p); break;
    case 'like': op({ type: 'react', id: p.id, value: 1 }); break;
    case 'vote': op({ type: 'react', id: p.id, value: +t.dataset.v }); break;
    case 'star': op({ type: 'react', id: p.id, value: +t.dataset.v }); break;
    case 'emoji': op({ type: 'react', id: p.id, value: t.dataset.v }); break;
    case 'emojiPick': e.stopPropagation(); emojiPicker(t, p); break;
    case 'pollVote': op({ type: 'pollVote', id: p.id, optionId: t.dataset.opt }); break;
    case 'approve': op({ type: 'approve', id: p.id }, 'Aprobada ✓'); break;
    case 'del': delPost(p); break;
    case 'grade': gradePost(p); break;
  }
}
function emojiPicker(anchor, p) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'menu'; m.style.display = 'flex'; m.style.minWidth = '0'; m.style.gap = '2px';
  EMOJI_SET.forEach(em => { const bt = document.createElement('button'); bt.textContent = em; bt.style.fontSize = '22px'; bt.style.padding = '6px'; bt.onclick = ev => { ev.stopPropagation(); closeMenu(); op({ type: 'react', id: p.id, value: em }); }; m.append(bt); });
  document.body.append(m);
  const r = anchor.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, r.left)) + 'px';
  m.style.top = (r.top - m.offsetHeight - 6 < 0 ? r.bottom + 6 : r.top - m.offsetHeight - 6) + 'px';
  openMenu = m; setTimeout(() => document.addEventListener('click', closeMenu, { once: true }), 0);
}
async function delPost(p) { if (await ask('Eliminar publicación', '¿Seguro? No se puede deshacer.', 'Eliminar', true)) op({ type: 'deletePost', id: p.id }, 'Eliminada'); }
async function gradePost(p) { const g = await promptDlg('Calificar', 'Nota o devolución corta (ej: 9, Muy bien, A+)', p.grade || ''); if (g !== null) op({ type: 'grade', id: p.id, grade: g }, g ? 'Calificada 💯' : 'Nota quitada'); }

function postMenu(anchor, p) {
  const b = S.board;
  menu(anchor, [
    { icon: '🔎', label: 'Abrir', act: () => postView(p.id) },
    (p.mine || b.admin) && canPost() && { icon: '✏️', label: 'Editar', act: () => composer({ edit: p }) },
    b.layout === 'columns' && canMove(p) && b.sections.length > 1 && { icon: '↔️', label: 'Mover a sección…', act: () => moveToSection(p) },
    { icon: '📋', label: 'Copiar texto', act: () => { navigator.clipboard?.writeText([p.title, p.body].filter(Boolean).join('\n')); toast('Copiado'); } },
    b.admin && '-',
    b.admin && { icon: '📌', label: p.pinned ? 'Desfijar' : 'Fijar arriba', act: () => op({ type: 'pin', id: p.id }) },
    b.admin && { icon: '💯', label: 'Calificar', act: () => gradePost(p) },
    b.admin && { icon: p.approved === false ? '✅' : '🙈', label: p.approved === false ? 'Aprobar' : 'Ocultar (volver a pendiente)', act: () => op({ type: 'approve', id: p.id, value: p.approved === false }) },
    (p.mine || b.admin) && '-',
    (p.mine || b.admin) && { icon: '🗑️', label: 'Eliminar', danger: true, act: () => delPost(p) },
  ]);
}
function moveToSection(p) {
  const b = S.board;
  const m = modal({ title: 'Mover a sección', body: `<div class="check-list">${b.sections.map(s => `<label><input type="radio" name="s" value="${s.id}" ${s.id === p.sectionId ? 'checked' : ''}> ${esc(s.title)}</label>`).join('')}</div>`, foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="go">Mover</button>` });
  $('#go', m.el).onclick = () => { const v = $('input:checked', m.el)?.value; m.close(); if (v) op({ type: 'movePost', id: p.id, sectionId: v }); };
}

function boardMenu(anchor) {
  const b = S.board;
  menu(anchor, [
    { icon: '▶', label: 'Modo presentación', act: slideshow },
    { icon: '📊', label: 'Exportar a CSV (Excel)', act: exportCSV },
    { icon: '🖨️', label: 'Imprimir / guardar PDF', act: () => print() },
    { icon: '🌓', label: 'Tema claro / oscuro', act: () => { toggleTheme(); } },
    !b.admin && b.courseId && { icon: '🎒', label: 'Ver otros muros del curso', act: () => (location.hash = `#/c/${b.courseId}`) },
    b.admin && '-',
    b.admin && { icon: '⚙️', label: 'Configuración del muro', act: settingsDrawer },
    b.admin && { icon: '🔁', label: 'Replicar en otros cursos…', act: () => S.index && replicateDialog(S.index.boards.find(x => x.id === b.id) || b) },
    b.admin && { icon: b.settings.locked ? '🔓' : '🔒', label: b.settings.locked ? 'Desbloquear muro' : 'Bloquear muro (solo lectura)', act: () => op({ type: 'updateBoard', patch: { settings: { locked: !b.settings.locked } } }, b.settings.locked ? 'Muro abierto' : 'Muro bloqueado 🔒') },
    b.admin && { icon: '🧹', label: 'Vaciar muro', danger: true, act: async () => { if (await ask('Vaciar muro', 'Se borrarán <b>todas</b> las publicaciones. La configuración se mantiene.', 'Vaciar', true)) op({ type: 'clearPosts' }, 'Muro vacío'); } },
  ]);
}

function exportCSV() {
  const b = S.board;
  const secName = id => b.sections.find(s => s.id === id)?.title || '';
  const reactTxt = p => { const r = p.react || {}; switch (b.settings.reactions) { case 'like': return r.count || 0; case 'vote': return `${r.up || 0} / -${r.down || 0}`; case 'star': return r.n ? r.avg.toFixed(2) : ''; case 'emoji': return Object.entries(r.counts || {}).map(([e, n]) => e + n).join(' '); default: return ''; } };
  const rows = [['Fecha', 'Autor', 'Título', 'Texto', 'Sección', 'Adjunto', 'Encuesta', 'Reacciones', 'Comentarios', 'Nota', 'Estado']];
  sortPosts(b.posts).forEach(p => rows.push([new Date(p.createdAt).toLocaleString('es-AR'), p.author, p.title, p.body, secName(p.sectionId), p.attach ? (p.attach.url.startsWith('/') ? location.origin + p.attach.url : p.attach.url.startsWith('data:') ? '(archivo local)' : p.attach.url) : '', p.poll ? p.poll.options.map(o => `${o.text}: ${o.n}`).join(' | ') : '', reactTxt(p), p.comments.map(c => `${c.author}: ${c.text}`).join(' | '), p.grade || '', p.approved === false ? 'pendiente' : 'publicada']));
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${b.title.replace(/[^\w\sáéíóúñ-]/gi, '').trim() || 'muro'}.csv`; a.click();
  toast('CSV descargado 📊');
}

// ---------- vista de publicación + comentarios ----------
function postView(id) {
  const b = S.board;
  const m = modal({ body: '', cls: 'post-view' });
  m.body.style.padding = '0'; m.body.style.gap = '0';
  const draw = () => {
    const p = S.board.posts.find(x => x.id === id); if (!p) { m.close(); return; }
    const focused = document.activeElement?.id === 'cmt';
    const draft = $('#cmt', m.el)?.value || '';
    m.body.innerHTML = `<div style="position:relative">${cardHTML(p, { static: true, full: true })}<button class="btn icon" data-close style="position:absolute;top:8px;right:8px;z-index:4">✕</button></div>
      ${b.settings.comments || p.comments.length ? `<div class="cmt-list">${p.comments.length ? p.comments.map(c => `<div class="cmt"><span class="av" style="background:${avColor(c.author)}">${esc(initials(c.author))}</span><div class="bub"><b>${esc(c.author)}${c.byAdmin ? ' 🎓' : ''}</b><time>${timeAgo(c.at)}</time>${c.mine || b.admin ? `<button class="btn ghost sm" data-delc="${c.id}" style="float:right;padding:0 6px">✕</button>` : ''}<div>${md(c.text)}</div></div></div>`).join('') : '<p class="muted" style="margin:8px 0;font-size:14px">Sin comentarios todavía. ¡Sé el primero!</p>'}</div>` : ''}
      ${(b.settings.comments || b.admin) && canPost() ? `<div class="cmt-form">${!me.name && !b.admin ? `<input type="text" id="cname" placeholder="Tu nombre" style="max-width:130px">` : ''}<input type="text" id="cmt" placeholder="Escribí un comentario…" maxlength="1000"><button class="btn primary" id="send">Enviar</button></div>` : ''}`;
    const inp = $('#cmt', m.el);
    if (inp) {
      inp.value = draft; if (focused) inp.focus();
      const send = async () => {
        const text = inp.value.trim(); if (!text) return;
        const cn = $('#cname', m.el); if (cn && cn.value.trim()) me.name = cn.value.trim();
        inp.value = '';
        await op({ type: 'comment', id, text, author: b.admin ? (me.name || 'Docente') : me.name });
      };
      $('#send', m.el).onclick = send; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); send(); } };
    }
    $$('[data-delc]', m.el).forEach(x => x.onclick = () => op({ type: 'deleteComment', id, commentId: x.dataset.delc }));
    // reacciones dentro del modal
    $$('.c-foot [data-act], .poll [data-act]', m.el).forEach(x => x.addEventListener('click', ev => { ev.stopPropagation(); const a = x.dataset.act; const v = x.dataset.v;
      if (a === 'like') op({ type: 'react', id, value: 1 }); else if (a === 'vote' || a === 'star') op({ type: 'react', id, value: +v }); else if (a === 'emoji') op({ type: 'react', id, value: v }); else if (a === 'emojiPick') emojiPicker(x, p); else if (a === 'pollVote') op({ type: 'pollVote', id, optionId: x.dataset.opt }); else if (a === 'grade') gradePost(p); }));
  };
  draw();
  const iv = setInterval(() => { if (!document.body.contains(m.el)) { clearInterval(iv); return; } const p = S.board.posts.find(x => x.id === id); const key = JSON.stringify(p); if (key !== m.el.dataset.k) { m.el.dataset.k = key; if (document.activeElement?.id !== 'cmt' || !$('#cmt', m.el)?.value) draw(); } }, 700);
  m.el.dataset.k = JSON.stringify(S.board.posts.find(x => x.id === id));
}

// ---------- composer ----------
async function compressImage(file, max = 1600, q = .84) {
  if (!/^image\/(jpeg|png|webp|bmp|heic|heif)/.test(file.type) || file.size < 250_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
    return blob && blob.size < file.size ? blob : file;
  } catch { return file; }
}

function composer({ sectionId, edit, lat, lng, x, y } = {}) {
  const b = S.board;
  if (!canPost()) return toast('El muro está bloqueado', true);
  const st = {
    color: edit?.color || (b.cardStyle === 'sticky' ? 'yellow' : 'white'),
    attach: edit?.attach || null,
    tab: edit?.attach ? (edit.attach.kind === 'video' ? 'link' : edit.attach.kind) : (edit?.poll ? 'poll' : null),
    sectionId: edit?.sectionId || sectionId || b.sections[0]?.id,
    lat: edit?.lat ?? lat ?? null, lng: edit?.lng ?? lng ?? null,
  };
  const tabs = [['image', '📷', 'Imagen'], ['link', '🔗', 'Enlace / video'], ['audio', '🎙️', 'Audio'], ['draw', '✏️', 'Dibujo'], ['file', '📎', 'Archivo'], ...(edit ? [] : [['poll', '📊', 'Encuesta']])];
  const m = modal({ title: edit ? 'Editar publicación' : 'Nueva publicación ✨', body: `
    <input type="text" id="ct" placeholder="Título (opcional)" maxlength="200" value="${esc(edit?.title || '')}" style="font-size:18px;font-weight:700">
    <textarea id="cb" placeholder="Escribí algo… (podés usar **negrita** y *cursiva*)" maxlength="5000">${esc(edit?.body || '')}</textarea>
    <div class="att-tabs">${tabs.map(([k, i, l]) => `<button class="att-tab ${st.tab === k ? 'sel' : ''}" data-tab="${k}"><span>${i}</span>${l}</button>`).join('')}</div>
    <div id="attPanel"></div>
    <div class="field">Color<div class="swatches">${CARD_COLORS.map(c => `<button class="sw ${c.id === st.color ? 'sel' : ''}" data-color="${c.id}" style="background:${c.bg}" title="${c.id}"></button>`).join('')}</div></div>
    ${b.layout === 'columns' && b.sections.length > 1 ? `<label class="field">Sección<select id="csec">${b.sections.map(s => `<option value="${s.id}" ${s.id === st.sectionId ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label>` : ''}
    ${b.layout === 'timeline' ? `<label class="field">Fecha del evento<input type="date" id="cdate" value="${esc(edit?.date || new Date().toISOString().slice(0, 10))}"></label>` : ''}
    ${b.layout === 'map' ? `<div class="field">Ubicación <div class="row"><input type="text" id="geo" placeholder="Buscar lugar (ej: Río Cuarto)"><button class="btn" id="geoBtn">Buscar</button></div><small id="geoInfo" class="muted">${st.lat != null ? `📍 ${(+st.lat).toFixed(4)}, ${(+st.lng).toFixed(4)}` : 'Tip: también podés tocar el mapa para elegir el lugar.'}</small></div>` : ''}
    ${!b.admin ? `<label class="field">Tu nombre ${b.settings.anonymous ? '<span style="font-weight:400">(opcional)</span>' : ''}<input type="text" id="cn" maxlength="60" value="${esc(edit?.author && edit.author !== 'Anónimo' ? edit.author : me.name)}" placeholder="${b.settings.anonymous ? 'Anónimo' : 'Nombre y apellido'}"></label>` : ''}
    ${b.settings.moderation && !b.admin && !edit ? '<p class="muted" style="margin:0;font-size:13px">🛡️ Este muro es moderado: tu publicación aparecerá cuando el docente la apruebe.</p>' : ''}`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pub">${edit ? 'Guardar' : 'Publicar 🚀'}</button>` });
  const panel = $('#attPanel', m.el);
  let busy = false, recorder = null, stream = null, pollOpts = edit?.poll ? edit.poll.options.map(o => o.text) : ['', ''];
  const cleanup = () => { try { recorder && recorder.state !== 'inactive' && recorder.stop(); } catch {} stream && stream.getTracks().forEach(t => t.stop()); };
  const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { cleanup(); obs.disconnect(); } }); obs.observe(document.body, { childList: true });

  const upload = async (blob, name, kind) => {
    busy = true; panel.innerHTML = `<div class="att-panel" style="text-align:center">⏳ Subiendo…</div>`;
    try { const r = await api.upload(blob, name); st.attach = { kind, url: r.url, name, mime: blob.type }; }
    catch (e) { toast(e.message, true); st.attach = null; }
    busy = false; drawPanel();
  };
  const preview = () => st.attach ? `<div class="att-preview">${attachHTML(st.attach, true)}<button class="btn icon x" id="rmAtt" title="Quitar">✕</button></div>` : '';

  function drawPanel() {
    $$('.att-tab', m.el).forEach(t => t.classList.toggle('sel', t.dataset.tab === st.tab));
    const t = st.tab;
    if (!t) { panel.innerHTML = ''; return; }
    if (st.attach && t !== 'poll') { panel.innerHTML = `<div class="att-panel">${preview()}</div>`; $('#rmAtt', panel).onclick = () => { st.attach = null; drawPanel(); }; return; }
    if (t === 'image' || t === 'file') {
      panel.innerHTML = `<label class="dropzone" id="dz"><div style="font-size:30px">${t === 'image' ? '🖼️' : '📎'}</div><b>Tocá para elegir ${t === 'image' ? 'una imagen o sacar una foto' : 'un archivo (PDF, documento…)'}</b><br><small>o arrastralo acá · máx. 5 MB${t === 'image' ? ' · también podés pegar con Ctrl+V' : ''}</small><input type="file" hidden ${t === 'image' ? 'accept="image/*"' : ''}></label>`;
      const dz = $('#dz', panel), fi = $('input', dz);
      const handle = async f => { if (!f) return; if (t === 'image' && !f.type.startsWith('image/')) return toast('Eso no es una imagen', true); upload(t === 'image' ? await compressImage(f) : f, f.name, t); };
      fi.onchange = () => handle(fi.files[0]);
      dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); handle(e.dataTransfer.files[0]); };
    } else if (t === 'link') {
      panel.innerHTML = `<div class="att-panel"><input type="url" id="lu" placeholder="https://… (YouTube, Vimeo, Spotify, Google Docs/Slides/Forms, Canva, imagen o cualquier web)"><input type="text" id="ln" placeholder="Nombre del enlace (opcional)"><button class="btn" id="la">Agregar enlace</button></div>`;
      const add = () => { let u = $('#lu', panel).value.trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; st.attach = { kind: embedSrc(u) ? 'video' : isImageUrl(u) ? 'image' : 'link', url: u, name: $('#ln', panel).value.trim() }; drawPanel(); };
      $('#la', panel).onclick = add; $('#lu', panel).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
      setTimeout(() => $('#lu', panel)?.focus(), 30);
    } else if (t === 'audio') {
      panel.innerHTML = `<div class="att-panel"><div class="rec"><button class="btn primary" id="recBtn">🎙️ Grabar</button><span id="recT" class="muted">Máximo 3 minutos</span></div><small class="muted">También podés <label style="color:var(--brand);cursor:pointer;text-decoration:underline">subir un audio<input type="file" accept="audio/*" hidden id="afi"></label>.</small></div>`;
      $('#afi', panel).onchange = e => { const f = e.target.files[0]; if (f) upload(f, f.name, 'audio'); };
      $('#recBtn', panel).onclick = async () => {
        if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast('No se pudo acceder al micrófono', true); }
        const chunks = []; recorder = new MediaRecorder(stream);
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => { stream.getTracks().forEach(t2 => t2.stop()); clearInterval(tm); const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }); upload(blob, 'audio.' + (blob.type.includes('mp4') ? 'm4a' : 'webm'), 'audio'); };
        recorder.start(); const t0 = Date.now();
        $('#recBtn', panel).innerHTML = '⏹️ Detener'; $('#recT', panel).innerHTML = '<span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--danger);animation:pulse 1s infinite"></span> 0:00';
        const tm = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const el = $('#recT', panel); if (el) el.lastChild.textContent = ` ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s >= 180) recorder.stop(); }, 250);
      };
    } else if (t === 'draw') {
      panel.innerHTML = `<div class="draw-wrap"><canvas width="900" height="600" id="cv"></canvas>
        <div class="row" style="flex-wrap:wrap"><div class="color-row">${['#1d1b22', '#e5484d', '#ff9a3c', '#f5c400', '#20b26b', '#3d6bff', '#a14cff', '#ff5c8a', '#8b5a2b', '#ffffff'].map((c, i) => `<button class="sw ${i === 0 ? 'sel' : ''}" data-pc="${c}" style="background:${c}"></button>`).join('')}</div>
        <select id="ps" style="width:auto"><option value="3">Fino</option><option value="7" selected>Medio</option><option value="16">Grueso</option><option value="40">Marcador</option></select>
        <button class="btn sm" id="undo">↶</button><button class="btn sm" id="clr">🧽 Limpiar</button><span class="spacer"></span><button class="btn sm primary" id="useDraw">Usar dibujo</button></div></div>`;
      const cv = $('#cv', panel), ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let color = '#1d1b22', size = 7, drawing = false, last = null; const hist = [];
      const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
      cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); hist.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (hist.length > 30) hist.shift(); drawing = true; last = pt(e); ctx.beginPath(); ctx.arc(last.x, last.y, size / 2, 0, 7); ctx.fillStyle = color; ctx.fill(); };
      cv.onpointermove = e => { if (!drawing) return; const p2 = pt(e); ctx.strokeStyle = color; ctx.lineWidth = size * (e.pressure && e.pointerType === 'pen' ? e.pressure * 2 : 1); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); last = p2; };
      cv.onpointerup = cv.onpointercancel = () => (drawing = false);
      $$('[data-pc]', panel).forEach(bt => bt.onclick = () => { color = bt.dataset.pc; $$('[data-pc]', panel).forEach(x => x.classList.toggle('sel', x === bt)); });
      $('#ps', panel).onchange = e => (size = +e.target.value);
      $('#undo', panel).onclick = () => { const h = hist.pop(); if (h) ctx.putImageData(h, 0, 0); };
      $('#clr', panel).onclick = () => { hist.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
      $('#useDraw', panel).onclick = () => cv.toBlob(bl => upload(bl, 'dibujo.png', 'draw'), 'image/png');
    } else if (t === 'poll') {
      const drawPoll = () => {
        panel.innerHTML = `<div class="att-panel"><input type="text" id="pq" placeholder="Pregunta de la encuesta" value="${esc(st.pq || '')}">${pollOpts.map((o, i) => `<div class="row"><input type="text" data-po="${i}" value="${esc(o)}" placeholder="Opción ${i + 1}">${pollOpts.length > 2 ? `<button class="btn icon ghost" data-rm="${i}">✕</button>` : ''}</div>`).join('')}${pollOpts.length < 8 ? '<button class="btn sm" id="addo">＋ Opción</button>' : ''}</div>`;
        $('#pq', panel).oninput = e => (st.pq = e.target.value);
        $$('[data-po]', panel).forEach(inp => inp.oninput = () => (pollOpts[+inp.dataset.po] = inp.value));
        $$('[data-rm]', panel).forEach(bt => bt.onclick = () => { pollOpts.splice(+bt.dataset.rm, 1); drawPoll(); });
        $('#addo', panel) && ($('#addo', panel).onclick = () => { pollOpts.push(''); drawPoll(); $$('[data-po]', panel).at(-1).focus(); });
      };
      st.pq = st.pq ?? edit?.poll?.question ?? '';
      drawPoll();
    }
  }
  $$('.att-tab', m.el).forEach(bt => bt.onclick = () => { if (busy) return; const k = bt.dataset.tab; if (st.attach && k !== st.tab) { if (!confirm('¿Reemplazar el adjunto actual?')) return; st.attach = null; } st.tab = st.tab === k && !st.attach ? null : k; drawPanel(); });
  $$('[data-color]', m.el).forEach(bt => bt.onclick = () => { st.color = bt.dataset.color; $$('[data-color]', m.el).forEach(x => x.classList.toggle('sel', x === bt)); $('.modal', m.el).style.setProperty('--sel', colorOf(st.color).bg); });
  m.el.addEventListener('paste', async e => { const f = [...(e.clipboardData?.files || [])].find(f2 => f2.type.startsWith('image/')); if (f && !busy) { e.preventDefault(); st.tab = 'image'; upload(await compressImage(f), f.name || 'imagen.png', 'image'); } });
  if (b.layout === 'map') {
    const geo = async () => { const q = $('#geo', m.el).value.trim(); if (!q) return; try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'es' } }).then(r2 => r2.json()); if (!r[0]) return toast('No encontramos ese lugar', true); st.lat = +r[0].lat; st.lng = +r[0].lon; $('#geoInfo', m.el).textContent = '📍 ' + r[0].display_name; } catch { toast('No se pudo buscar el lugar', true); } };
    $('#geoBtn', m.el).onclick = geo; $('#geo', m.el).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); geo(); } };
  }
  drawPanel();

  $('#pub', m.el).onclick = async () => {
    if (busy) return toast('Esperá a que termine la subida', true);
    const nameEl = $('#cn', m.el);
    if (nameEl) { const n = nameEl.value.trim(); if (n) me.name = n; else if (!b.settings.anonymous) return toast('Este muro pide tu nombre', true); }
    const data = { title: $('#ct', m.el).value, body: $('#cb', m.el).value, color: st.color, attach: st.attach };
    if ($('#csec', m.el)) data.sectionId = $('#csec', m.el).value; else if (!edit) data.sectionId = st.sectionId;
    if ($('#cdate', m.el)) data.date = $('#cdate', m.el).value;
    if (b.layout === 'map') { if (st.lat == null) { const c = S.map?.getCenter(); if (c) { st.lat = c.lat; st.lng = c.lng; } } data.lat = st.lat; data.lng = st.lng; }
    if (nameEl) data.author = nameEl.value.trim(); else if (b.admin && !edit) data.author = me.name || 'Docente';
    if (st.tab === 'poll' && !edit) { const opts = pollOpts.map(o => o.trim()).filter(Boolean); if (opts.length < 2) return toast('La encuesta necesita al menos 2 opciones', true); data.poll = { question: st.pq || '', options: opts }; }
    if (!edit && b.layout === 'canvas') { const wrap = $('.L-canvas-wrap'); data.x = x ?? ((wrap?.scrollLeft || 0) / S.zoom + 60 + Math.random() * 300); data.y = y ?? ((wrap?.scrollTop || 0) / S.zoom + 40 + Math.random() * 200); }
    const r = await op(edit ? { type: 'updatePost', id: edit.id, ...data } : { type: 'addPost', ...data });
    if (r) { m.close(); if (!edit) { confetti(); toast(b.settings.moderation && !b.admin ? 'Enviada, espera aprobación ⏳' : '¡Publicado! 🎉'); } }
  };
}

// ---------- drag & drop en columnas ----------
function setupColumnDnD(area) {
  let dragId = null;
  $$('.card[draggable]', area).forEach(c => {
    c.addEventListener('dragstart', e => { dragId = c.dataset.id; S.dragging = true; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => (c.style.opacity = '.4'), 0); });
    c.addEventListener('dragend', () => { c.style.opacity = ''; S.dragging = false; $$('.col-drop', area).forEach(d => d.classList.remove('over')); });
  });
  $$('.col-drop', area).forEach(drop => {
    drop.addEventListener('dragover', e => { if (!dragId) return; e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', e => { if (!drop.contains(e.relatedTarget)) drop.classList.remove('over'); });
    drop.addEventListener('drop', e => {
      e.preventDefault(); drop.classList.remove('over'); if (!dragId) return;
      const cards = $$('.card', drop).filter(c => c.dataset.id !== dragId);
      let index = cards.length;
      for (let i = 0; i < cards.length; i++) { const r = cards[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { index = i; break; } }
      const id = dragId; dragId = null; S.dragging = false;
      op({ type: 'movePost', id, sectionId: drop.dataset.sec, index });
    });
  });
}

// ---------- lienzo libre ----------
function setupCanvas(area) {
  const canvas = $('.L-canvas', area);
  canvas.addEventListener('dblclick', e => { if (e.target !== canvas || !canPost()) return; const r = canvas.getBoundingClientRect(); composer({ x: (e.clientX - r.left) / S.zoom, y: (e.clientY - r.top) / S.zoom }); });
  $$('.card', canvas).forEach(card => {
    const p = S.board.posts.find(x => x.id === card.dataset.id);
    if (!p || !canMove(p)) return;
    const grip = $('.grip', card);
    grip.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      e.preventDefault(); grip.setPointerCapture(e.pointerId);
      S.dragging = true; card.classList.add('dragging');
      const sx = e.clientX, sy = e.clientY, ox = p.x, oy = p.y;
      const move = ev => { card.style.left = Math.max(0, ox + (ev.clientX - sx) / S.zoom) + 'px'; card.style.top = Math.max(0, oy + (ev.clientY - sy) / S.zoom) + 'px'; };
      const up = ev => {
        grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up);
        card.classList.remove('dragging'); S.dragging = false;
        const nx = Math.max(0, ox + (ev.clientX - sx) / S.zoom), ny = Math.max(0, oy + (ev.clientY - sy) / S.zoom);
        if (Math.abs(nx - ox) + Math.abs(ny - oy) > 2) { p.x = nx; p.y = ny; op({ type: 'movePost', id: p.id, x: Math.round(nx), y: Math.round(ny) }); }
      };
      grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
    });
  });
}

// ---------- mapa ----------
function renderMap(area, posts) {
  if (!window.L) { area.innerHTML = '<div class="empty">Cargando mapa…</div>'; setTimeout(() => S.board?.layout === 'map' && renderArea(), 400); return; }
  if (!S.map || !document.body.contains(S.map.getContainer())) {
    area.innerHTML = `<div style="position:relative"><div class="L-map" id="map"></div>${canPost() ? '<div class="map-hint">👆 Tocá el mapa para publicar en ese lugar</div>' : ''}</div>`;
    S.map = L.map('map', { worldCopyJump: true }).setView([-33.12, -64.35], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(S.map);
    S.markers = {};
    S.map.on('click', e => { if (canPost()) composer({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    S.map.on('popupopen', e => { const el = e.popup.getElement(); el && !el.dataset.wired && (el.dataset.wired = 1, el.addEventListener('click', onBoardClick)); });
    S.firstFit = true;
  }
  const withLoc = posts.filter(p => p.lat != null && p.lng != null);
  const ids = new Set(withLoc.map(p => p.id));
  Object.keys(S.markers).forEach(id => { if (!ids.has(id)) { S.markers[id].remove(); delete S.markers[id]; } });
  withLoc.forEach(p => {
    const c = colorOf(p.color);
    const icon = L.divIcon({ className: '', html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${c.bg};border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);display:grid;place-items:center"><span style="transform:rotate(45deg);font-size:14px">${p.attach?.kind === 'image' ? '📷' : p.poll ? '📊' : p.attach?.kind === 'audio' ? '🎙️' : '📝'}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] });
    const html = `<div class="cs-${S.board.cardStyle}">${cardHTML(p, { static: false })}</div>`;
    let mk = S.markers[p.id];
    if (!mk) {
      mk = L.marker([p.lat, p.lng], { icon, draggable: canMove(p) }).addTo(S.map).bindPopup(html, { maxWidth: 280, minWidth: 260 });
      mk.on('dragend', () => { const ll = mk.getLatLng(); op({ type: 'movePost', id: p.id, lat: ll.lat, lng: ll.lng }); });
      S.markers[p.id] = mk;
    } else {
      mk.setLatLng([p.lat, p.lng]); mk.setIcon(icon);
      if (mk.isPopupOpen()) mk.getPopup().setContent(html); else mk.setPopupContent(html);
    }
  });
  if (S.firstFit && withLoc.length) { S.map.fitBounds(L.latLngBounds(withLoc.map(p => [p.lat, p.lng])).pad(.3), { maxZoom: 12 }); S.firstFit = false; }
  setTimeout(() => S.map && S.map.invalidateSize(), 50);
}

// ---------- configuración ----------
function settingsDrawer() {
  $$('.drawer').forEach(d => d.remove());
  const d = document.createElement('div'); d.className = 'drawer';
  const save = patch => op({ type: 'updateBoard', patch });
  const draw = () => {
    const b = S.board, s = b.settings;
    const sw = (k, label, help) => `<label class="switch"><span>${label}${help ? `<small>${help}</small>` : ''}</span><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''}></label>`;
    d.innerHTML = `<div class="modal-head"><h2>⚙️ Configurar muro</h2><button class="btn icon ghost" id="dc">✕</button></div>
    <div class="modal-body">
      <div class="row"><input type="text" id="se" value="${esc(b.emoji)}" maxlength="4" style="width:58px;text-align:center;font-size:22px;padding:6px"><input type="text" id="st" value="${esc(b.title)}" maxlength="120" style="font-weight:700"></div>
      <textarea id="sd" placeholder="Descripción o consigna para los estudiantes" style="min-height:70px">${esc(b.description)}</textarea>
      <h3>Formato</h3>
      <div class="lay-grid">${LAYOUTS.map(l => `<button class="lay-opt ${l.id === b.layout ? 'sel' : ''}" data-lay="${l.id}" title="${esc(l.desc)}"><span>${l.icon}</span>${l.name}</button>`).join('')}</div>
      ${b.layout === 'columns' ? `<h3>Secciones</h3><div id="secs" style="display:grid;gap:6px">${b.sections.map((x, i) => `<div class="row"><input type="text" data-sec="${i}" value="${esc(x.title)}"><button class="btn icon ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn icon ghost" data-rm="${i}" ${b.sections.length < 2 ? 'disabled' : ''}>✕</button></div>`).join('')}</div><button class="btn sm" id="addSec">＋ Sección</button>` : ''}
      <h3>Fondo</h3>
      <div class="wp-grid">${WALLPAPERS.map(w => `<button class="wp ${w.id === b.wallpaper ? 'sel' : ''}" data-wp="${w.id}" style="${wpStyle(w.id).style}">${w.name}</button>`).join('')}</div>
      <div class="row"><input type="url" id="wpu" placeholder="…o pegá la URL de una imagen" value="${b.wallpaper.startsWith('url:') ? esc(b.wallpaper.slice(4)) : ''}"><label class="btn sm" title="Subir imagen">📷<input type="file" accept="image/*" hidden id="wpf"></label></div>
      <h3>Estilo de tarjetas</h3>
      <div class="seg">${[['clean', 'Limpio'], ['sticky', 'Post-it'], ['glass', 'Vidrio'], ['outline', 'Cómic']].map(([k, l]) => `<button class="${b.cardStyle === k ? 'sel' : ''}" data-cs="${k}">${l}</button>`).join('')}</div>
      <h3>Tipografía</h3>
      <div class="seg">${FONTS.map(f => `<button class="${b.font === f.id ? 'sel' : ''}" data-font="${f.id}" style="font-family:${f.css}">${f.name}</button>`).join('')}</div>
      <h3>Reacciones</h3>
      <select id="sr">${REACTIONS.map(r => `<option value="${r.id}" ${r.id === s.reactions ? 'selected' : ''}>${r.name}</option>`).join('')}</select>
      <h3>Participación</h3>
      ${sw('comments', '💬 Comentarios', 'Los estudiantes pueden comentar publicaciones')}
      ${sw('moderation', '🛡️ Moderación', 'Las publicaciones esperan tu aprobación')}
      ${sw('anonymous', '🎭 Permitir anónimos', 'Si se apaga, el nombre es obligatorio')}
      ${sw('showAuthor', '👤 Mostrar autores', 'Si se apaga, solo vos ves quién publicó')}
      ${sw('allowMove', '✋ Todos pueden mover', 'En lienzo, columnas y mapa')}
      ${sw('locked', '🔒 Bloquear muro', 'Solo lectura: nadie más puede publicar')}
      ${sw('listed', '👁️ Visible en la página del curso', '')}
    </div>`;
    $('#dc', d).onclick = () => d.remove();
    const tx = (sel, key) => { const el = $(sel, d); el.onchange = () => save({ [key]: el.value }); };
    tx('#st', 'title'); tx('#sd', 'description'); tx('#se', 'emoji');
    $$('[data-lay]', d).forEach(bt => bt.onclick = async () => { await save({ layout: bt.dataset.lay }); draw(); });
    $$('[data-wp]', d).forEach(bt => bt.onclick = async () => { await save({ wallpaper: bt.dataset.wp }); draw(); });
    $('#wpu', d).onchange = async e => { const u = e.target.value.trim(); if (/^https?:\/\//.test(u)) { await save({ wallpaper: 'url:' + u }); draw(); } };
    $('#wpf', d).onchange = async e => { const f = e.target.files[0]; if (!f) return; const r = await run(async () => api.upload(await compressImage(f, 2200, .8), f.name)); if (r) { if (r.url.startsWith('data:')) return toast('En modo local usá una URL para el fondo', true); await save({ wallpaper: 'url:' + r.url }); draw(); } };
    $$('[data-cs]', d).forEach(bt => bt.onclick = async () => { await save({ cardStyle: bt.dataset.cs }); draw(); });
    $$('[data-font]', d).forEach(bt => bt.onclick = async () => { await save({ font: bt.dataset.font }); draw(); });
    $('#sr', d).onchange = e => save({ settings: { reactions: e.target.value } });
    $$('[data-set]', d).forEach(inp => inp.onchange = () => save({ settings: { [inp.dataset.set]: inp.checked } }));
    if (b.layout === 'columns') {
      const secs = () => S.board.sections.map(x => ({ ...x }));
      $$('[data-sec]', d).forEach(inp => inp.onchange = () => { const a = secs(); a[+inp.dataset.sec].title = inp.value; save({ sections: a }); });
      $$('[data-up]', d).forEach(bt => bt.onclick = async () => { const a = secs(); const i = +bt.dataset.up; [a[i - 1], a[i]] = [a[i], a[i - 1]]; await save({ sections: a }); draw(); });
      $$('[data-rm]', d).forEach(bt => bt.onclick = async () => { const a = secs(); const i = +bt.dataset.rm; if (!(await ask('Quitar sección', `Las publicaciones de “${esc(a[i].title)}” pasan a la primera sección.`, 'Quitar', true))) return; a.splice(i, 1); await save({ sections: a }); draw(); });
      $('#addSec', d).onclick = async () => { const a = secs(); a.push({ id: rid(6), title: 'Sección ' + (a.length + 1) }); await save({ sections: a }); draw(); };
    }
  };
  draw();
  document.body.append(d);
}

// ---------- presentación ----------
function slideshow() {
  const posts = visiblePosts().filter(p => p.approved !== false);
  if (!posts.length) return toast('No hay publicaciones para mostrar', true);
  const b = S.board, w = wpStyle(b.wallpaper), font = FONTS.find(f => f.id === b.font) || FONTS[0];
  let i = 0, auto = null;
  const el = document.createElement('div');
  el.className = `slides cs-${b.cardStyle}`; el.style.cssText = w.style + `--card-font:${font.css}`;
  const draw = () => {
    const p = posts[i];
    el.innerHTML = `<div class="progress"><div style="width:${(i + 1) * 100 / posts.length}%"></div></div>
      <div class="stage">${cardHTML(p, { static: true, full: true })}</div>
      <button class="nav" style="left:20px" data-s="-1">‹</button><button class="nav" style="right:20px" data-s="1">›</button>
      <div class="bar"><b style="font-size:18px">${esc(b.emoji)} ${esc(b.title)}</b><span class="spacer"></span><span>${i + 1} / ${posts.length}</span>
      <button class="btn sm" data-auto>${auto ? '⏸ Pausa' : '⏵ Auto'}</button><button class="btn sm" data-shuffle>🔀</button><button class="btn sm" data-fs>⛶</button><button class="btn sm" data-x>✕ Salir</button></div>`;
  };
  const go = d => { i = (i + d + posts.length) % posts.length; draw(); };
  const close = () => { clearInterval(auto); el.remove(); document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  const key = e => { if (e.key === 'ArrowRight' || e.key === ' ') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') close(); };
  el.onclick = e => {
    const t = e.target;
    if (t.closest('[data-s]')) go(+t.closest('[data-s]').dataset.s);
    else if (t.closest('[data-x]')) close();
    else if (t.closest('[data-fs]')) (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen()).catch(() => {});
    else if (t.closest('[data-shuffle]')) { posts.sort(() => Math.random() - .5); i = 0; draw(); }
    else if (t.closest('[data-auto]')) { if (auto) { clearInterval(auto); auto = null; } else auto = setInterval(() => go(1), 6000); draw(); }
  };
  let tx = null;
  el.addEventListener('touchstart', e => (tx = e.touches[0].clientX), { passive: true });
  el.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); tx = null; });
  document.addEventListener('keydown', key);
  draw(); document.body.append(el);
}

// ======================= inicio =======================
(async () => {
  api = await connect();
  route();
  document.addEventListener('keydown', e => {
    if (e.key === 'n' && S.board && location.hash.startsWith('#/b/') && !e.target.closest('input,textarea,select,[contenteditable]') && !$('.overlay,.slides')) { e.preventDefault(); composer({}); }
  });
})();
