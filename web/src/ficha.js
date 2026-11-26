import { IND, BY_KEY, TEMAS, SECTORES, SECT_CORTO, CULTIVOS, FUELS, FUENTES } from './catalog.js';
import { fmt, fmtK, esc, compact, css } from './util.js';

let S, H, det;
const BASE = import.meta.env.BASE_URL + 'data/';
export function initFicha(state, handlers) { S = state; H = handlers; }
async function detalle() { if (!det) det = await fetch(BASE + 'detalle.json').then((r) => r.json()); return det; }

function rank(level, id, k) {
  const recs = level === 'd' ? S.data.deptos : S.data.provincias;
  const v = recs[id]?.[k]; if (v == null) return null;
  const all = Object.values(recs).map((r) => r[k]).filter((x) => x != null);
  return { pos: all.filter((x) => x > v).length + 1, of: all.length };
}
function rowsFor(level, id, rec, keys) {
  const pais = S.data.pais;
  return keys.filter((k) => rec[k] != null && BY_KEY[k]).map((k) => {
    const i = BY_KEY[k]; const rk = rank(level, id, k);
    const ref = pais[k] != null && level !== 'pais' ? `Argentina: ${fmtK(k, pais[k])}` : '';
    const rkTxt = rk && level !== 'pais' ? `${rk.pos}.º de ${rk.of}` : '';
    return `<tr><th><button type="button" class="mapit" data-ind="${k}" title="Ver en el mapa">${esc(i.l)}</button></th>
      <td>${fmtK(k, rec[k])} <small>${esc(i.u)}${rkTxt ? ' · ' + rkTxt : ''}${ref ? '<br>' + ref : ''}</small></td></tr>`;
  }).join('');
}
function pyramid(p) {
  if (!p) return '';
  const max = Math.max(...p.flat()); const h = 9, w = 300, mid = w / 2, lab = 34;
  const rows = p.map(([m, v], i) => {
    const y = (p.length - 1 - i) * h; const wm = (m / max) * (mid - lab / 2 - 4), wv = (v / max) * (mid - lab / 2 - 4);
    const age = i === p.length - 1 ? '100+' : `${i * 5}`;
    return `<rect x="${mid - lab / 2 - wm}" y="${y}" width="${wm}" height="${h - 1.5}" fill="${css('--seq-5')}"/>
      <rect x="${mid + lab / 2}" y="${y}" width="${wv}" height="${h - 1.5}" fill="${css('--div-neg-2')}"/>
      ${i % 2 === 0 ? `<text x="${mid}" y="${y + h - 2}" text-anchor="middle" font-size="8" fill="${css('--ink-3')}">${age}</text>` : ''}`;
  }).join('');
  const H_ = p.length * h;
  return `<svg class="pyr" viewBox="0 0 ${w} ${H_ + 14}" role="img" aria-label="Pirámide de población por sexo y grupos de 5 años">${rows}
    <text x="${mid - lab / 2 - 4}" y="${H_ + 11}" text-anchor="end" font-size="9" fill="${css('--ink-2')}">Mujeres</text>
    <text x="${mid + lab / 2 + 4}" y="${H_ + 11}" font-size="9" fill="${css('--ink-2')}">Varones</text></svg>`;
}
function sectorBars(rec) {
  const pais = S.data.pais;
  const items = SECTORES.map((s) => ({ s, v: rec['sec_' + s] || 0, r: pais['sec_' + s] || 0 })).filter((x) => x.v > 0 || x.r > 2).sort((a, b) => b.v - a.v).slice(0, 10);
  const max = Math.max(...items.map((x) => Math.max(x.v, x.r)), 1);
  return `<div class="bars">${items.map((x) => `<div class="b"><div class="t"><span><button type="button" class="mapit" data-ind="sec_${x.s}">${esc(SECT_CORTO[x.s])}</button></span>
    <div class="track"><div class="fill" style="width:${(x.v / max) * 100}%"></div><div class="ref" style="left:${(x.r / max) * 100}%" title="Argentina: ${fmt(x.r, 'd1')} %"></div></div></div>
    <div class="n">${fmt(x.v, 'd1')} %</div></div>`).join('')}</div>
    <p class="note">Peso de cada sector en el empleo privado registrado. La marca negra es el promedio del país.</p>`;
}
function list(items, fmtFn) { return `<ul class="list">${items.map(fmtFn).join('')}</ul>`; }

function section(title, html) { return html ? `<section class="sec"><h3>${esc(title)}</h3>${html}</section>` : ''; }
function themeKeys(theme, level) {
  return IND.filter((i) => i.t === theme && (level === 'pais' ? true : i.lv.includes(level))).map((i) => i.k);
}
const DEMO = ['edad_mediana', 'pct_0_14', 'pct_65', 'dependencia', 'masculinidad', 'pct_rural_disp', 'var_pob', 'n_localidades'];

export async function renderPlace(level, id) {
  const el = document.getElementById('ficha');
  const d = await detalle();
  const isPais = level === 'pais';
  const rec = isPais ? S.data.pais : level === 'd' ? S.data.deptos[id] : S.data.provincias[id];
  if (!rec) { el.innerHTML = '<p class="empty">Sin datos para este lugar.</p>'; return; }
  const provId = level === 'd' ? S.data.nombres[id].p : level === 'p' ? id : null;
  const name = isPais ? 'Argentina' : level === 'd' ? S.data.nombres[id].n : rec.nombre;
  const kind = isPais ? 'País' : level === 'd' ? (provId === '06' ? 'Partido' : provId === '02' ? 'Comuna' : 'Departamento') : provId === '02' ? 'Ciudad autónoma' : 'Provincia';
  const crumbs = isPais ? '' : `<nav class="crumbs" aria-label="Ubicación"><button type="button" data-go="pais">Argentina</button>${level === 'd' ? ` › <button type="button" data-go="p:${provId}">${esc(S.data.provincias[provId].nombre)}</button>` : ''}</nav>`;
  const pob = rec.pob, sharePais = !isPais ? (pob / S.data.pais.pob) * 100 : null;
  const kpi = (v, l, c = '') => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div>${c ? `<div class="c">${c}</div>` : ''}</div>`;
  const kpis = `<div class="kpis">
    ${kpi(compact(pob), 'habitantes (2022)', sharePais != null ? `${fmt(sharePais, 'd1')} % del país` : '')}
    ${kpi(fmt(rec.densidad, 'd1'), 'hab. por km²', `${fmt(rec.area)} km²`)}
    ${kpi((rec.var_pob > 0 ? '+' : '') + fmt(rec.var_pob, 'd1') + ' %', 'crecimiento 2010–2022')}
    ${kpi(compact(rec.empleo), 'empleos privados registrados', rec.empleo_1000 != null ? `${fmt(rec.empleo_1000, 'd1')} cada 1.000 hab.` : '')}
  </div>`;

  // Pirámide
  const pyr = isPais ? d.piramides.prov.AR : level === 'p' ? d.piramides.prov[id] : d.piramides.depto[id];
  let html = `<p class="ficha-kind">${kind}</p><h2 class="ficha-title">${esc(name)}</h2>${crumbs}${kpis}`;
  html += section('Población', pyramid(pyr) + `<table class="rows">${rowsFor(level, id, rec, DEMO)}</table>`);

  // Pobreza y trabajo (EPH) en aglomerados del lugar
  const agl = S.points.agl.filter((a) => isPais || (level === 'p' ? a.prov === id : a.d === id));
  if (agl.length) html += section('Pobreza y empleo urbano (EPH)', `<table class="rows">${agl.map((a) => `<tr><th><button type="button" class="mapit" data-pt="aglomerados:${S.points.agl.indexOf(a)}">${esc(a.n)}</button></th><td>${fmt(a.pobreza, 'd1')} % pobreza<small>${fmt(a.indigencia, 'd1')} % indigencia · ${fmt(a.desocupacion, 'd1')} % desocupación</small></td></tr>`).join('')}</table>
    <p class="note">Encuesta Permanente de Hogares: pobreza del 1.er semestre de 2026 y desocupación del 2.º trimestre de 2026. Sólo cubre el aglomerado urbano, no el resto del territorio. Total 31 aglomerados: 32,3 % de pobreza.</p>`);

  for (const th of [TEMAS.viv, TEMAS.edu, TEMAS.trab]) {
    const keys = themeKeys(th, isPais ? 'pais' : level);
    const rows = rowsFor(isPais ? 'pais' : level, id, rec, keys);
    html += section(th, rows ? `<table class="rows">${rows}</table>` : '');
  }

  // Empleo por sector
  html += section('Empleo privado por sector', rec.empleo ? sectorBars(rec) : '');
  if (level === 'd' && d.deptos[id]) {
    const dd = d.deptos[id];
    if (dd.esp.length) html += section('En qué se especializa', `<div class="chips">${dd.esp.map((e) => `<span class="chip" title="${fmt(e.peso, 'd1')} % del empleo; ${fmt(e.cl, 'd1')} veces el peso nacional">${esc(e.sector)} ×${fmt(e.cl, 'd1')}</span>`).join('')}</div>
      <p class="note">Sectores que pesan al menos 1,4 veces más que en el país y reúnen el 3 % del empleo o más.</p>`);
    if (dd.act.length) html += section('Actividades con más empleo', list(dd.act, (a) => `<li><span>${esc(a.desc)}</span><span>${fmt(a.empleo)}</span></li>`));
  }
  if (level === 'p' && d.provincias[id]?.ramas?.length) html += section('Ramas con más empleo', list(d.provincias[id].ramas, (a) => `<li><span>${esc(a.desc)}</span><span>${fmt(a.empleo)}</span></li>`));

  // Agro
  const agro = CULTIVOS.map((c) => ({ c, v: rec['agro_' + c] || 0 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  if (agro.length) html += section(`Agro · campaña ${S.data.campania}`, `<table class="rows">${rowsFor(isPais ? 'pais' : level, id, rec, ['granos_t', 'pct_sembrado'])}</table>` +
    list(agro, (x) => `<li><span><button type="button" data-ind="agro_${x.c}">${esc(x.c)}</button></span><span>${fmt(x.v)} t</span></li>`));

  // Energía e infraestructura
  const fu = FUELS.map((f) => ({ f, v: rec['mw_' + f] || 0 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const infraRows = rowsFor(isPais ? 'pais' : level, id, rec, ['potencia_mw', 'aeropuertos']);
  html += section('Energía e infraestructura', infraRows ? `<table class="rows">${infraRows}</table>` + (fu.length ? list(fu, (x) => `<li><span><button type="button" data-ind="mw_${x.f}">${esc(x.f)}</button></span><span>${fmt(x.v)} MW</span></li>`) : '') : '');

  // Territorio
  html += section('Territorio', `<table class="rows">${rowsFor(isPais ? 'pais' : level, id, rec, ['area', 'elev_media', 'elev_max'])}</table>`);

  // Localidades
  const locs = S.points.loc.map((l, i) => ({ l, i })).filter(({ l }) => isPais || (level === 'd' ? l[4] === id : l[5].slice(0, 2) === id)).slice(0, 10);
  if (locs.length) html += section(isPais ? 'Localidades más pobladas' : 'Localidades principales', list(locs, ({ l, i }) => `<li><span><button type="button" data-pt="localidades:${i}">${esc(l[3])}</button></span><span>${fmt(l[2])} hab.</span></li>`));

  // Departamentos de la provincia
  if (level === 'p') {
    const k = BY_KEY[S.ind] && BY_KEY[S.ind].lv.includes('d') ? S.ind : 'pob';
    const deps = Object.entries(S.data.nombres).filter(([, n]) => n.p === id).map(([did, n]) => ({ did, n: n.n, v: S.data.deptos[did]?.[k] })).sort((a, b) => (b.v ?? -1e18) - (a.v ?? -1e18));
    html += section(`${provId === '06' ? 'Partidos' : provId === '02' ? 'Comunas' : 'Departamentos'} · ${BY_KEY[k].l.toLowerCase()}`, list(deps, (x) => `<li><span><button type="button" data-go="d:${x.did}">${esc(x.n)}</button></span><span>${fmtK(k, x.v)}</span></li>`));
  }
  if (isPais) {
    html = html.replace('<section class="sec">', `<p class="lede" style="font-size:var(--t-sm);margin-bottom:var(--s-5)">Elegí un indicador a la izquierda, tocá una provincia o un departamento en el mapa, o buscá un lugar arriba. Cada dato lleva su fuente en la sección «Fuentes».</p><section class="sec">`);
  }
  el.innerHTML = html;
  el.scrollTop = 0;
}

export function renderPoint(layer, i) {
  const el = document.getElementById('ficha');
  const P = S.points;
  const back = (d) => d ? `<nav class="crumbs"><button type="button" data-go="pais">Argentina</button> › <button type="button" data-go="p:${d.slice(0, 2)}">${esc(S.data.provincias[d.slice(0, 2)]?.nombre)}</button> › <button type="button" data-go="d:${d}">${esc(S.data.nombres[d]?.n)}</button></nav>` : '';
  const head = (kind, title, d) => `<p class="ficha-kind">${kind}</p><h2 class="ficha-title">${esc(title)}</h2>${back(d)}`;
  const tbl = (rows) => `<table class="rows">${rows.filter((r) => r[1] != null && r[1] !== '').map(([a, b]) => `<tr><th>${esc(a)}</th><td>${b}</td></tr>`).join('')}</table>`;
  const src = (k) => `<p class="srcs">Fuente: ${esc(FUENTES[k].nombre)} (${esc(FUENTES[k].anio)}).</p>`;
  let html = '';
  if (layer === 'localidades') {
    const l = P.loc[i];
    const rk = P.loc.filter((x) => x[2] > l[2]).length + 1;
    html = head('Localidad', l[3], l[4]) + tbl([['Población 2022', fmt(l[2]) + ' hab.'], ['Viviendas', l[6] != null ? fmt(l[6]) : null], ['Puesto por población', `${rk}.º de ${fmt(P.loc.length)} localidades`], ['Código INDEC', l[5]]]) +
      '<p class="note">Población de la localidad censal (sin la zona rural del departamento). En el Gran Buenos Aires cada partido figura como una localidad.</p>' + src('censo22');
  } else if (layer === 'aglomerados') {
    const a = P.agl[i];
    html = head('Aglomerado urbano (EPH)', a.n, a.d) + tbl([['Pobreza (personas)', fmt(a.pobreza, 'd1') + ' %'], ['Pobreza (hogares)', fmt(a.pobreza_hog, 'd1') + ' %'], ['Indigencia (personas)', fmt(a.indigencia, 'd1') + ' %'],
      ['Tasa de actividad', fmt(a.actividad, 'd1') + ' %'], ['Tasa de empleo', fmt(a.empleo, 'd1') + ' %'], ['Desocupación', fmt(a.desocupacion, 'd1') + ' %'], ['Subocupación', fmt(a.subocupacion, 'd1') + ' %']]) +
      `<p class="note">Promedio de los 31 aglomerados: pobreza 32,3 %, indigencia 7,5 %, desocupación 7,9 %.</p>` + src('eph_pob') + src('eph_trab');
  } else if (layer === 'centrales') {
    const c = P.cen[i];
    html = head('Central eléctrica', c.n, c.d) + tbl([['Fuente', esc(c.f)], ['Potencia instalada', fmt(c.mw) + ' MW'], ['Generación estimada 2017', c.gwh != null ? fmt(c.gwh) + ' GWh' : null], ['Puesta en marcha', c.anio], ['Operador', c.own ? esc(c.own) : null]]) + src('centrales');
  } else if (layer === 'universidades') {
    const u = P.uni[i];
    html = head('Universidad', u.n, u.d) + tbl([['Gestión', esc(u.t)], ['Sede principal', esc(u.loc)], ['Fundación', u.anio]]) + src('univ');
  } else if (layer === 'aeropuertos') {
    const a = P.aer[i];
    html = head('Aeropuerto o aeródromo', a.n, a.d) + tbl([['Tipo', esc(a.t)], ['Código IATA', a.iata], ['Vuelos regulares', a.reg ? 'Sí' : 'No'], ['Elevación', a.elev_m != null ? fmt(a.elev_m) + ' m' : null], ['Localidad', a.mun ? esc(a.mun) : null]]) + src('aeropuertos');
  } else if (layer === 'parques') {
    const p = P.par[i];
    html = head('Área protegida', p.n, p.d) + tbl([['Provincia', esc(p.prov)], ['Superficie', fmt(p.km2) + ' km²'], ['Creación', p.anio]]) + src('parques');
  } else if (layer === 'puertos') {
    const p = P.pue[i];
    html = head('Puerto', p.n, p.d) + src('ne');
  } else if (layer === 'escuelas') {
    const e = P.esc[i];
    html = head('Escuela', e[4], e[5]) + tbl([['Nivel', e[2] === 1 ? 'Secundario' : 'Primario'], ['Gestión', e[3] === 1 ? 'Privada' : 'Estatal']]) + src('escuelas');
  }
  el.innerHTML = html; el.scrollTop = 0;
}
