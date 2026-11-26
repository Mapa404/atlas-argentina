import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import './style.css';
import { IND, BY_KEY, CAPAS, FUENTES } from './catalog.js';
import { fmtK, esc, norm, fmt, css, compact } from './util.js';
import * as M from './map.js';
import { initFicha, renderPlace, renderPoint } from './ficha.js';
import { initExplorer, renderExplorer, renderFuentes } from './explorer.js';

const S = { level: 'p', ind: 'pob', layers: new Set(['relieve', 'rios']), sel: { level: 'pais', id: null }, view: 'mapa' };
window.__atlas = S;

const H = {
  select(level, id, fly = true) {
    S.sel = { level, id }; M.highlight(level, id); M.highlightPoint(null);
    if (fly && level !== 'pais') M.flyToBbox(level + id);
    if (level === 'pais') M.resetView();
    renderPlace(level, id); writeHash();
  },
  selectPoint(layer, i) {
    S.sel = { level: 'pt', layer, i }; M.highlightPoint(layer, i); M.highlight(null, null);
    renderPoint(layer, i); writeHash();
  },
  openOnMap(level, id) {
    setView('mapa');
    if (S.level !== level) setLevel(level);
    H.select(level, id);
  },
};

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('i') && BY_KEY[p.get('i')]) S.ind = p.get('i');
  if (p.get('i') === 'ninguno') S.ind = null;
  if (p.get('n') === 'd' || p.get('n') === 'p') S.level = p.get('n');
  if (p.get('c')) S.layers = new Set(p.get('c').split(',').filter(Boolean));
  if (p.get('v')) S.view = p.get('v');
  const s = p.get('s');
  return s;
}
function writeHash() {
  const p = new URLSearchParams();
  p.set('i', S.ind || 'ninguno'); p.set('n', S.level); p.set('c', [...S.layers].join(','));
  if (S.view !== 'mapa') p.set('v', S.view);
  if (S.sel.level === 'p' || S.sel.level === 'd') p.set('s', S.sel.level + ':' + S.sel.id);
  else if (S.sel.level === 'pt') p.set('s', `pt:${S.sel.layer}:${S.sel.i}`);
  try { history.replaceState(null, '', '#' + p.toString()); } catch (e) { /* marco sin historial */ }
}

function renderIndicators() {
  const el = document.getElementById('lista-indicadores');
  const groups = {};
  for (const i of IND) (groups[i.t] ||= []).push(i);
  const openT = BY_KEY[S.ind]?.t;
  el.innerHTML = `<label class="ind ${!S.ind ? 'is-on' : ''}"><input type="radio" name="ind" value="" ${!S.ind ? 'checked' : ''}> <span>Sin indicador (mapa físico)</span></label>` +
    Object.entries(groups).map(([t, is]) => `<details class="group" ${t === openT || (!openT && t === 'Población') ? 'open' : ''}><summary>${esc(t)}</summary>
    ${is.map((i) => {
      const ok = i.lv.includes(S.level);
      const lvl = i.lv === 'p' ? 'sólo provincias' : i.lv === 'd' ? 'sólo deptos.' : '';
      return `<label class="ind ${S.ind === i.k ? 'is-on' : ''} ${ok ? '' : 'is-off'}" title="${esc(i.d || i.u)}"><input type="radio" name="ind" value="${i.k}" ${S.ind === i.k ? 'checked' : ''}> <span>${esc(i.l)}</span>${lvl && !ok ? `<span class="lvl">${lvl}</span>` : ''}</label>`;
    }).join('')}</details>`).join('');
  el.querySelectorAll('input[name=ind]').forEach((r) => r.onchange = () => setIndicator(r.value || null));
}
function renderLayers() {
  const sw = { localidades: '--pt-localidad', aglomerados: '--pt-pobreza', escuelas: '--pt-escuela-est', universidades: '--pt-univ', centrales: '--div-neg-2', aeropuertos: '--pt-aero', puertos: '--pt-puerto', parques: '--pt-parque', rios: '--ln-rio', rutas: '--ln-ruta', ferrocarriles: '--ln-tren', glaciares: '--line-2', relieve: '--seq-3' };
  const ln = new Set(['rios', 'rutas', 'ferrocarriles']);
  document.getElementById('lista-capas').innerHTML = CAPAS.map((c) => `<label class="capa" title="Fuente: ${esc(FUENTES[c.s].nombre)}"><input type="checkbox" value="${c.k}" ${S.layers.has(c.k) ? 'checked' : ''}><span class="sw ${ln.has(c.k) ? 'ln' : ''}" style="background:var(${sw[c.k]})"></span>${esc(c.l)}</label>`).join('');
  document.querySelectorAll('#lista-capas input').forEach((cb) => cb.onchange = () => {
    cb.checked ? S.layers.add(cb.value) : S.layers.delete(cb.value);
    M.setLayer(cb.value, cb.checked); writeHash();
  });
}
function renderLegend(br) {
  const el = document.getElementById('legend'); const i = BY_KEY[S.ind];
  if (!i || !br) { el.innerHTML = `<h3>Mapa físico</h3><p class="u">Relieve, ríos y lagos</p>`; return; }
  const f = i.f === 'n' ? 'n' : i.f;
  const F = (v) => Math.abs(v) >= 10000 ? compact(v) : fmt(v, f);
  const ticks = br.diverging ? [F(br.min), F(br.center), F(br.max)] : [F(br.min), ...br.cuts.filter((_, k) => k % 2 === 1).map(F), F(br.max)];
  el.innerHTML = `<h3>${esc(i.l)}</h3><p class="u">${esc(i.u)} · ${S.level === 'd' ? 'por departamento' : 'por provincia'}</p>
    <div class="bar">${br.colors.map((c) => `<span style="background:${c}"></span>`).join('')}</div>
    <div class="ticks">${ticks.map((t) => `<span>${t}</span>`).join('')}</div>
    <div class="nd"><i></i> Sin dato</div>
    <p class="src">${br.diverging ? 'Colores divergentes alrededor de ' + fmt(br.center, f) + '. ' : 'Clases por cuantiles. '}Fuente: ${esc(FUENTES[i.s].nombre)} (${esc(FUENTES[i.s].anio)}).</p>`;
}
function setIndicator(k) {
  S.ind = k;
  const i = BY_KEY[k];
  if (i && !i.lv.includes(S.level)) { setLevel(i.lv.includes('p') ? 'p' : 'd', true); }
  renderLegend(M.paint()); renderIndicators(); writeHash();
  if (S.sel.level === 'p' && S.level === 'p') renderPlace('p', S.sel.id);
}
function setLevel(l, silent = false) {
  S.level = l;
  document.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === l)));
  if (BY_KEY[S.ind] && !BY_KEY[S.ind].lv.includes(l)) S.ind = 'pob';
  if (!silent) { renderLegend(M.paint()); renderIndicators(); writeHash(); }
  S.updLabels && S.updLabels();
}
function setView(v) {
  S.view = v;
  for (const x of ['mapa', 'explorador', 'fuentes']) document.getElementById('view-' + x).hidden = x !== v;
  document.querySelectorAll('[data-view]').forEach((b) => (b.dataset.view === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  if (v === 'explorador') renderExplorer();
  if (v === 'fuentes') renderFuentes();
  if (v === 'mapa') setTimeout(M.resize, 0);
  writeHash();
}

// --- búsqueda ---
function buildIndex() {
  const idx = [];
  for (const [id, p] of Object.entries(S.data.provincias)) idx.push({ t: p.nombre, k: id === '02' ? 'Ciudad autónoma' : 'Provincia', go: () => H.openOnMap('p', id), w: 3 });
  for (const [id, n] of Object.entries(S.data.nombres)) idx.push({ t: n.n, k: `${n.p === '06' ? 'Partido' : n.p === '02' ? 'Comuna' : 'Depto.'} · ${S.data.provincias[n.p].nombre}`, go: () => H.openOnMap('d', id), w: 2 });
  S.points.loc.forEach((l, i) => idx.push({ t: l[3], k: `Localidad · ${S.data.nombres[l[4]]?.n || ''}`, go: () => { setView('mapa'); if (!S.layers.has('localidades')) { S.layers.add('localidades'); M.setLayer('localidades', true); renderLayers(); } M.flyTo(l[0], l[1], 9); H.selectPoint('localidades', i); }, w: 1, pob: l[2] }));
  S.points.uni.forEach((u, i) => idx.push({ t: u.n, k: 'Universidad', go: () => { setView('mapa'); if (!S.layers.has('universidades')) { S.layers.add('universidades'); M.setLayer('universidades', true); renderLayers(); } M.flyTo(u.x, u.y, 9); H.selectPoint('universidades', i); }, w: 1 }));
  S.points.par.forEach((u, i) => idx.push({ t: u.n, k: 'Parque nacional', go: () => { setView('mapa'); if (!S.layers.has('parques')) { S.layers.add('parques'); M.setLayer('parques', true); renderLayers(); } M.flyTo(u.x, u.y, 7); H.selectPoint('parques', i); }, w: 1 }));
  for (const x of idx) x.nt = norm(x.t);
  return idx;
}
function wireSearch() {
  const inp = document.getElementById('q'), ul = document.getElementById('q-results');
  let res = [], act = -1;
  const close = () => { ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); act = -1; };
  const draw = () => {
    ul.innerHTML = res.map((r, i) => `<li role="option" id="qr${i}" aria-selected="${i === act}"><span>${esc(r.t)}</span><span class="kind">${esc(r.k)}</span></li>`).join('');
    ul.hidden = !res.length; inp.setAttribute('aria-expanded', String(!!res.length));
    if (act >= 0) inp.setAttribute('aria-activedescendant', 'qr' + act); else inp.removeAttribute('aria-activedescendant');
    ul.querySelectorAll('li').forEach((li, i) => li.onmousedown = (e) => { e.preventDefault(); pick(i); });
  };
  const pick = (i) => { const r = res[i]; if (!r) return; inp.value = r.t; close(); r.go(); };
  inp.oninput = () => {
    const q = norm(inp.value.trim()); if (q.length < 2) { res = []; draw(); return; }
    res = S.index.filter((x) => x.nt.includes(q)).sort((a, b) => (b.nt.startsWith(q) - a.nt.startsWith(q)) || (b.w - a.w) || ((b.pob || 0) - (a.pob || 0))).slice(0, 12);
    act = res.length ? 0 : -1; draw();
  };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { act = Math.min(res.length - 1, act + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { act = Math.max(0, act - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { pick(act); }
    else if (e.key === 'Escape') close();
  };
  inp.onblur = () => setTimeout(close, 100);
}

async function boot() {
  const sel = readHash();
  S.data = await fetch(import.meta.env.BASE_URL + 'data/datos.json').then((r) => r.json());
  initFicha(S, H); initExplorer(S, H);
  renderIndicators(); renderLayers();
  document.querySelectorAll('[data-level]').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.level === S.level)); b.onclick = () => setLevel(b.dataset.level); });
  document.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => setView(b.dataset.view));
  document.getElementById('toggle-capas').onclick = () => document.querySelector('.panel-capas').classList.toggle('is-open');
  // clicks dentro de la ficha
  document.getElementById('ficha').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ind) { setIndicator(b.dataset.ind); return; }
    if (b.dataset.go) { const [l, id] = b.dataset.go.split(':'); if (l === 'pais') H.select('pais'); else { if (l !== S.level) setLevel(l); H.select(l, id); } return; }
    if (b.dataset.pt) { const [layer, i] = b.dataset.pt.split(':'); if (!S.layers.has(layer)) { S.layers.add(layer); M.setLayer(layer, true); renderLayers(); } const P = { localidades: (j) => S.points.loc[j], aglomerados: (j) => S.points.agl[j] }[layer](+i); M.flyTo(P.x ?? P[0], P.y ?? P[1], 8); H.selectPoint(layer, +i); }
  });
  await M.initMap(S, H);
  for (const c of CAPAS) if (c.k !== 'relieve') M.setLayer(c.k, S.layers.has(c.k));
  renderLegend(M.paint());
  S.index = buildIndex(); wireSearch();
  // selección inicial
  if (sel && sel.startsWith('pt:')) { const [, layer, i] = sel.split(':'); H.selectPoint(layer, +i); }
  else if (sel) { const [l, id] = sel.split(':'); H.select(l, id); }
  else renderPlace('pais');
  setView(S.view);
}
boot();
