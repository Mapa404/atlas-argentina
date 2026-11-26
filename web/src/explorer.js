import { IND, BY_KEY, FUENTES, TEMAS, CAPAS } from './catalog.js';
import { fmt, fmtK, esc, download, norm, css } from './util.js';

let S, H;
const st = { level: 'd', cols: ['pob', 'densidad', 'var_pob', 'edad_mediana', 'empleo_1000', 'granos_t'], sort: 'pob', dir: -1, q: '', prov: '', x: 'densidad', y: 'empleo_1000', logx: true, logy: false };

export function initExplorer(state, handlers) { S = state; H = handlers; }

function rows() {
  const out = [];
  if (st.level === 'd') {
    for (const [id, n] of Object.entries(S.data.nombres)) {
      if (st.prov && n.p !== st.prov) continue;
      out.push({ id, n: n.n, prov: S.data.provincias[n.p].nombre, r: S.data.deptos[id] || {} });
    }
  } else {
    for (const [id, r] of Object.entries(S.data.provincias)) out.push({ id, n: r.nombre, prov: '', r });
  }
  const q = norm(st.q);
  return out.filter((x) => !q || norm(x.n + ' ' + x.prov).includes(q));
}
function sorted(rs) {
  const k = st.sort;
  return rs.sort((a, b) => {
    if (k === 'n') return st.dir * a.n.localeCompare(b.n, 'es');
    const av = a.r[k], bv = b.r[k];
    if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
    return st.dir * (av - bv);
  });
}
function avail() { return IND.filter((i) => i.lv.includes(st.level)); }
function options(sel) {
  const groups = {};
  for (const i of avail()) (groups[i.t] ||= []).push(i);
  return Object.entries(groups).map(([t, is]) => `<optgroup label="${esc(t)}">${is.map((i) => `<option value="${i.k}" ${i.k === sel ? 'selected' : ''}>${esc(i.l)}</option>`).join('')}</optgroup>`).join('');
}

export function renderExplorer() {
  const el = document.getElementById('view-explorador');
  st.cols = st.cols.filter((k) => BY_KEY[k].lv.includes(st.level));
  if (!st.cols.length) st.cols = ['pob'];
  if (!BY_KEY[st.x].lv.includes(st.level)) st.x = 'densidad';
  if (!BY_KEY[st.y].lv.includes(st.level)) st.y = 'empleo_1000';
  const provOpts = Object.entries(S.data.provincias).sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, 'es')).map(([id, p]) => `<option value="${id}" ${st.prov === id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('');
  el.innerHTML = `<div class="wrap">
    <h2>Explorador de datos</h2>
    <p class="lede">Todos los indicadores en una tabla. Ordená por cualquier columna, sumá o quitá columnas, compará dos variables en el gráfico y descargá el resultado en CSV. Tocá una fila para verla en el mapa.</p>
    <div class="toolbar">
      <div class="field"><span>Nivel</span><div class="seg" role="group" aria-label="Nivel"><button type="button" data-xl="p" aria-pressed="${st.level === 'p'}">Provincias</button><button type="button" data-xl="d" aria-pressed="${st.level === 'd'}">Departamentos</button></div></div>
      ${st.level === 'd' ? `<label class="field"><span>Provincia</span><select id="x-prov"><option value="">Todas</option>${provOpts}</select></label>` : ''}
      <label class="field"><span>Filtrar por nombre</span><input id="x-q" type="search" value="${esc(st.q)}" placeholder="Ej.: Rosario, Comuna 1"></label>
      <label class="field"><span>Agregar columna</span><select id="x-add"><option value="">Elegir indicador…</option>${options('')}</select></label>
      <button type="button" class="btn btn-primary" id="x-csv">Descargar CSV</button>
    </div>
    <div class="ex-grid">
      <div class="table-wrap" id="x-table"></div>
      <div class="scatter-card">
        <h3>Comparar dos indicadores</h3>
        <div class="toolbar" style="margin:var(--s-2) 0">
          <label class="field"><span>Eje horizontal</span><select id="x-x">${options(st.x)}</select></label>
          <label class="field"><span>Eje vertical</span><select id="x-y">${options(st.y)}</select></label>
        </div>
        <div class="toolbar" style="margin:0 0 var(--s-2)">
          <label class="capa"><input type="checkbox" id="x-logx" ${st.logx ? 'checked' : ''}> Escala logarítmica en X</label>
          <label class="capa"><input type="checkbox" id="x-logy" ${st.logy ? 'checked' : ''}> en Y</label>
        </div>
        <div id="x-scatter"></div>
      </div>
    </div>
  </div>`;
  table(); scatter();
  el.querySelectorAll('[data-xl]').forEach((b) => b.onclick = () => { st.level = b.dataset.xl; st.prov = ''; renderExplorer(); });
  const pv = el.querySelector('#x-prov'); if (pv) pv.onchange = () => { st.prov = pv.value; table(); scatter(); };
  el.querySelector('#x-q').oninput = (e) => { st.q = e.target.value; table(); scatter(); };
  el.querySelector('#x-add').onchange = (e) => { if (e.target.value && !st.cols.includes(e.target.value)) st.cols.push(e.target.value); e.target.value = ''; table(); };
  el.querySelector('#x-x').onchange = (e) => { st.x = e.target.value; scatter(); };
  el.querySelector('#x-y').onchange = (e) => { st.y = e.target.value; scatter(); };
  el.querySelector('#x-logx').onchange = (e) => { st.logx = e.target.checked; scatter(); };
  el.querySelector('#x-logy').onchange = (e) => { st.logy = e.target.checked; scatter(); };
  el.querySelector('#x-csv').onclick = csv;
}

function table() {
  const rs = sorted(rows());
  const th = (k, label, num) => `<th scope="col" aria-sort="${st.sort === k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" data-sort="${k}" title="${num ? esc(BY_KEY[k].u) : ''}">${esc(label)}</button>${num ? ` <button type="button" data-rm="${k}" aria-label="Quitar columna ${esc(label)}" title="Quitar columna" style="color:var(--ink-3)">×</button>` : ''}</th>`;
  const html = `<table class="data"><thead><tr>${th('n', st.level === 'd' ? 'Departamento' : 'Provincia')}${st.level === 'd' ? '<th scope="col">Provincia</th>' : ''}${st.cols.map((k) => th(k, BY_KEY[k].l, true)).join('')}</tr></thead>
    <tbody>${rs.map((x) => `<tr data-id="${x.id}" tabindex="0"><td>${esc(x.n)}</td>${st.level === 'd' ? `<td>${esc(x.prov)}</td>` : ''}${st.cols.map((k) => `<td class="num">${fmtK(k, x.r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="note" style="padding:var(--s-2) var(--s-3)">${rs.length} filas.</p>`;
  const el = document.getElementById('x-table'); el.innerHTML = html;
  el.querySelectorAll('[data-sort]').forEach((b) => b.onclick = () => { const k = b.dataset.sort; if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = k === 'n' ? 1 : -1; } table(); });
  el.querySelectorAll('[data-rm]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); st.cols = st.cols.filter((k) => k !== b.dataset.rm); table(); });
  el.querySelectorAll('tbody tr').forEach((tr) => {
    const go = () => H.openOnMap(st.level, tr.dataset.id);
    tr.onclick = go; tr.onkeydown = (e) => { if (e.key === 'Enter') go(); };
  });
}

function scatter() {
  const rs = rows().filter((x) => x.r[st.x] != null && x.r[st.y] != null && (!st.logx || x.r[st.x] > 0) && (!st.logy || x.r[st.y] > 0));
  const el = document.getElementById('x-scatter');
  if (rs.length < 3) { el.innerHTML = '<p class="empty">No hay suficientes datos para comparar estos dos indicadores.</p>'; return; }
  const W = 400, Hh = 320, m = { l: 48, r: 22, t: 10, b: 36 };
  const tx = (v) => st.logx ? Math.log10(v) : v, ty = (v) => st.logy ? Math.log10(v) : v;
  const xs = rs.map((x) => tx(x.r[st.x])), ys = rs.map((x) => ty(x.r[st.y]));
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)], [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = (v) => m.l + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r), sy = (v) => Hh - m.b - ((v - y0) / (y1 - y0 || 1)) * (Hh - m.t - m.b);
  const ticks = (a, b, log) => { const n = 4; return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n).map((v) => ({ v, lab: log ? fmt(10 ** v, 10 ** v < 10 ? 'd1' : 'n') : fmt(v, Math.abs(b - a) < 10 ? 'd1' : 'n') })); };
  const xt = ticks(x0, x1, st.logx), yt = ticks(y0, y1, st.logy);
  // correlación de Pearson sobre los valores (transformados si es log)
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  const rr = sxy / Math.sqrt(sxx * syy);
  el.innerHTML = `<svg class="scatter" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Gráfico de dispersión de ${esc(BY_KEY[st.x].l)} contra ${esc(BY_KEY[st.y].l)}">
    ${xt.map((t) => `<line class="ax" x1="${sx(t.v)}" x2="${sx(t.v)}" y1="${m.t}" y2="${Hh - m.b}" stroke-dasharray="2 3"/><text x="${sx(t.v)}" y="${Hh - m.b + 13}" text-anchor="middle">${t.lab}</text>`).join('')}
    ${yt.map((t) => `<line class="ax" x1="${m.l}" x2="${W - m.r}" y1="${sy(t.v)}" y2="${sy(t.v)}" stroke-dasharray="2 3"/><text x="${m.l - 5}" y="${sy(t.v) + 3}" text-anchor="end">${t.lab}</text>`).join('')}
    ${rs.map((x, i) => `<circle cx="${sx(xs[i])}" cy="${sy(ys[i])}" r="${st.level === 'p' ? 5 : 3}" data-id="${x.id}" tabindex="-1"><title>${esc(x.n)}${x.prov ? ' (' + esc(x.prov) + ')' : ''}: ${fmtK(st.x, x.r[st.x])} / ${fmtK(st.y, x.r[st.y])}</title></circle>`).join('')}
    <text x="${(W + m.l) / 2}" y="${Hh - 4}" text-anchor="middle" style="fill:var(--ink-2)">${esc(BY_KEY[st.x].l)} (${esc(BY_KEY[st.x].u)})</text>
    <text transform="translate(11 ${(Hh - m.b) / 2}) rotate(-90)" text-anchor="middle" style="fill:var(--ink-2)">${esc(BY_KEY[st.y].l)}</text>
  </svg><p class="corr">${rs.length} ${st.level === 'd' ? 'departamentos' : 'provincias'} · correlación r = ${fmt(rr, 'd2')}${st.logx || st.logy ? ' (sobre la escala elegida)' : ''}. Una correlación no implica que una cosa cause la otra.</p>`;
  el.querySelectorAll('circle').forEach((c) => c.onclick = () => H.openOnMap(st.level, c.dataset.id));
}

function csv() {
  const rs = sorted(rows());
  const head = ['codigo', st.level === 'd' ? 'departamento' : 'provincia', ...(st.level === 'd' ? ['provincia'] : []), ...st.cols.map((k) => `${BY_KEY[k].l} (${BY_KEY[k].u})`)];
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = [head.map(q).join(',')];
  for (const x of rs) lines.push([x.id, x.n, ...(st.level === 'd' ? [x.prov] : []), ...st.cols.map((k) => x.r[k] ?? '')].map(q).join(','));
  lines.push(''); lines.push(q('Fuentes: ' + [...new Set(st.cols.map((k) => FUENTES[BY_KEY[k].s].nombre))].join(' | ')));
  download(`atlas-argentina-${st.level === 'd' ? 'departamentos' : 'provincias'}.csv`, lines.join('\n'));
}

export function renderFuentes() {
  const el = document.getElementById('view-fuentes');
  const uses = {};
  for (const i of IND) (uses[i.s] ||= new Set()).add(i.t);
  for (const c of CAPAS) (uses[c.s] ||= new Set()).add('Capa: ' + c.l);
  el.innerHTML = `<div class="wrap">
    <h2>Fuentes y notas</h2>
    <p class="lede">Cada dato del atlas sale de una fuente pública. Cuando la fuente oficial no se podía descargar directamente, se usó una copia publicada en GitHub por un equipo o una persona identificable; se indica en cada caso.</p>
    <ul class="src-list">${Object.entries(FUENTES).map(([k, f]) => `<li><h3>${esc(f.nombre)}</h3><p class="y">${esc(f.anio)}</p><p>${esc(f.detalle)}</p>
      ${uses[k] ? `<p class="y">Se usa en: ${esc([...uses[k]].join(', '))}</p>` : ''}<a href="${esc(f.url)}" target="_blank" rel="noopener">Ver fuente</a></li>`).join('')}</ul>
    <div class="caveats"><h3>Para leer con cuidado</h3><ul>
      <li>Los años no coinciden entre fuentes: el censo es de 2022, el empleo registrado de alrededor de 2022, la cosecha de 2024/25 y la pobreza de 2026. Algunas variables de vivienda y educación por departamento son del Censo 2010, y lo dicen en su nombre.</li>
      <li>La pobreza y la desocupación de la EPH miden sólo 31 aglomerados urbanos. No se pueden extender a toda la provincia.</li>
      <li>El empleo privado registrado deja afuera el empleo público, el informal y el cuentapropismo, y se asigna al departamento donde está el establecimiento, no donde vive la persona.</li>
      <li>La población 2022 es la de viviendas particulares (45,6 millones); el total oficial del censo, que suma viviendas colectivas y personas en situación de calle, es algo mayor.</li>
      <li>La base de centrales eléctricas es de 2021 y no incluye la mayoría de los parques eólicos y solares nuevos. El padrón de escuelas es de alrededor de 2016.</li>
      <li>El relieve usa una grilla de unos 18 km: sirve para ver la forma del territorio, no para alturas exactas (el Aconcagua mide 6.961 m).</li>
      <li>La Antártida Argentina forma parte de la provincia de Tierra del Fuego pero no se dibuja en el mapa principal. Las Islas Malvinas y del Atlántico Sur aparecen sin datos porque no fueron censadas.</li>
    </ul></div></div>`;
}
