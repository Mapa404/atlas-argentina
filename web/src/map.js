import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
maplibregl.setWorkerUrl(workerUrl);
import { BY_KEY } from './catalog.js';
import { css, breaks, colorFor, fmtK, esc, compact, fmt } from './util.js';

const BASE = import.meta.env.BASE_URL + 'data/';
let map, S, H, deptosGJ, provGJ;
const loaded = {};
const labelMarkers = { prov: [], city: [] };

async function getJSON(f) { if (!loaded[f]) loaded[f] = fetch(BASE + f).then((r) => r.json()); return loaded[f]; }

function bboxOf(geom) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const walk = (c) => { if (typeof c[0] === 'number') { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } else c.forEach(walk); };
  walk(geom.coordinates); return [x0, y0, x1, y1];
}
function labelPoint(geom) {
  // centroide del anillo exterior del polígono más grande
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = null, bestA = -1;
  for (const p of polys) {
    const r = p[0]; let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f; }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = [cx / (3 * a), cy / (3 * a)]; }
  }
  return best;
}
export const bboxes = {};

export async function initMap(state, handlers) {
  S = state; H = handlers;
  const [d, p, rel] = await Promise.all([getJSON('deptos.geo.json'), getJSON('provincias.geo.json'), getJSON('relieve_meta.json')]);
  deptosGJ = d; provGJ = p;
  for (const f of d.features) bboxes['d' + f.properties.id] = bboxOf(f.geometry);
  for (const f of p.features) bboxes['p' + f.properties.prov] = bboxOf(f.geometry);
  const [W, Sb, E, N] = rel.bounds;

  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {},
      layers: [{ id: 'bg', type: 'background', paint: { 'background-color': css('--sea') } }],
    },
    bounds: [[-74, -55.5], [-53, -21.5]],
    fitBoundsOptions: { padding: 20 },
    minZoom: 2.5, maxZoom: 12, attributionControl: false, dragRotate: false, pitchWithRotate: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Datos públicos: ver «Fuentes»' }));
  await new Promise((r) => map.on('load', r));

  map.addSource('vecinos', { type: 'geojson', data: BASE + 'vecinos.geo.json' });
  map.addLayer({ id: 'vecinos', type: 'fill', source: 'vecinos', paint: { 'fill-color': css('--paper-2') } });
  map.addLayer({ id: 'vecinos-ln', type: 'line', source: 'vecinos', paint: { 'line-color': css('--line-2'), 'line-width': .6 } });
  map.addSource('relieve', { type: 'image', url: BASE + 'relieve.png', coordinates: [[W, N], [E, N], [E, Sb], [W, Sb]] });
  map.addLayer({ id: 'relieve', type: 'raster', source: 'relieve', paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 } });

  map.addSource('deptos', { type: 'geojson', data: d, promoteId: 'id' });
  map.addSource('prov', { type: 'geojson', data: p, promoteId: 'prov' });
  const fillPaint = (lvl) => ({
    'fill-color': ['coalesce', ['feature-state', 'c'], css('--nodata')],
    'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], .95, .82],
  });
  map.addLayer({ id: 'deptos-fill', type: 'fill', source: 'deptos', paint: fillPaint('d'), layout: { visibility: 'none' } });
  map.addLayer({ id: 'prov-fill', type: 'fill', source: 'prov', paint: fillPaint('p') });
  map.addLayer({ id: 'deptos-ln', type: 'line', source: 'deptos', paint: { 'line-color': '#ffffff', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, .25, 6, .7], 'line-width': ['interpolate', ['linear'], ['zoom'], 3, .2, 7, .8] } });

  // capas naturales y de transporte
  map.addSource('glaciares', { type: 'geojson', data: BASE + 'glaciares.geo.json' });
  map.addLayer({ id: 'glaciares', type: 'fill', source: 'glaciares', paint: { 'fill-color': css('--glaciar'), 'fill-opacity': .9 }, layout: { visibility: 'none' } });
  map.addSource('lagos', { type: 'geojson', data: BASE + 'lagos.geo.json' });
  map.addLayer({ id: 'lagos', type: 'fill', source: 'lagos', paint: { 'fill-color': css('--sea') } });
  map.addSource('rios', { type: 'geojson', data: BASE + 'rios.geo.json' });
  map.addLayer({ id: 'rios', type: 'line', source: 'rios', paint: { 'line-color': css('--ln-rio'), 'line-width': ['interpolate', ['linear'], ['zoom'], 3, .5, 8, 1.6] } });
  map.addSource('rutas', { type: 'geojson', data: BASE + 'rutas.geo.json' });
  map.addLayer({ id: 'rutas', type: 'line', source: 'rutas', paint: { 'line-color': css('--ln-ruta'), 'line-width': ['interpolate', ['linear'], ['zoom'], 3, .5, 8, 1.8], 'line-opacity': .85 }, layout: { visibility: 'none' } });
  map.addSource('ferrocarriles', { type: 'geojson', data: BASE + 'ferrocarriles.geo.json' });
  map.addLayer({ id: 'ferrocarriles', type: 'line', source: 'ferrocarriles', paint: { 'line-color': css('--ln-tren'), 'line-width': ['interpolate', ['linear'], ['zoom'], 3, .5, 8, 1.4], 'line-dasharray': [3, 2] }, layout: { visibility: 'none' } });

  map.addLayer({ id: 'prov-ln', type: 'line', source: 'prov', paint: { 'line-color': css('--ink'), 'line-opacity': .55, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, .6, 7, 1.4] } });
  map.addLayer({ id: 'sel-ln', type: 'line', source: 'deptos', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': css('--focus'), 'line-width': 2.5 } });
  map.addLayer({ id: 'sel-prov-ln', type: 'line', source: 'prov', filter: ['==', ['get', 'prov'], ''], paint: { 'line-color': css('--focus'), 'line-width': 2.5 } });

  await addPointLayers();
  addLabels();
  wireEvents();
  return map;
}

async function addPointLayers() {
  const fc = (feats) => ({ type: 'FeatureCollection', features: feats });
  const pt = (x, y, props) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x, y] }, properties: props });
  const [loc, esc_, uni, cen, aer, pue, par, agl] = await Promise.all(['pt_localidades.json', 'pt_escuelas.json', 'pt_universidades.json', 'pt_centrales.json', 'pt_aeropuertos.json', 'pt_puertos.json', 'pt_parques.json', 'pt_aglomerados.json'].map(getJSON));
  S.points = { loc, uni, cen, aer, pue, par, agl, esc: esc_ };

  map.addSource('escuelas', { type: 'geojson', data: fc(esc_.map((e, i) => pt(e[0], e[1], { i, priv: e[3], niv: e[2], n: e[4] }))) });
  map.addLayer({ id: 'escuelas', type: 'circle', source: 'escuelas', layout: { visibility: 'none' }, paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, .8, 8, 3.5], 'circle-color': ['case', ['==', ['get', 'priv'], 1], css('--pt-escuela-priv'), css('--pt-escuela-est')], 'circle-opacity': .7 } });

  map.addSource('localidades', { type: 'geojson', data: fc(loc.map((l, i) => pt(l[0], l[1], { i, pob: l[2], n: l[3] }))) });
  map.addLayer({ id: 'localidades', type: 'circle', source: 'localidades', layout: { visibility: 'none' }, filter: ['>=', ['get', 'pob'], 0], paint: {
    'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'pob']], 0, 1.2, 100, 2.5, 1000, 9, 1800, 16],
    'circle-color': css('--pt-localidad'), 'circle-opacity': .28, 'circle-stroke-color': css('--pt-localidad'), 'circle-stroke-width': .6, 'circle-stroke-opacity': .6 } });

  map.addSource('aglomerados', { type: 'geojson', data: fc(agl.map((a, i) => pt(a.x, a.y, { i, v: a.pobreza, n: a.n }))) });
  map.addLayer({ id: 'aglomerados', type: 'circle', source: 'aglomerados', layout: { visibility: 'none' }, paint: {
    'circle-radius': ['interpolate', ['linear'], ['get', 'v'], 10, 6, 60, 18], 'circle-color': css('--pt-pobreza'), 'circle-opacity': .75, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.2 } });

  const simple = (id, arr, color, r = 4.5, extra = {}) => {
    map.addSource(id, { type: 'geojson', data: fc(arr.map((a, i) => pt(a.x, a.y, { i, n: a.n, ...extra(a) }))) });
    map.addLayer({ id, type: 'circle', source: id, layout: { visibility: 'none' }, paint: {
      'circle-radius': typeof r === 'number' ? ['interpolate', ['linear'], ['zoom'], 3, r * .7, 8, r * 1.4] : r,
      'circle-color': color, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
  };
  simple('universidades', uni, css('--pt-univ'), 4.5, () => ({}));
  simple('puertos', pue, css('--pt-puerto'), 4.5, () => ({}));
  simple('parques', par, css('--pt-parque'), ['interpolate', ['linear'], ['sqrt', ['get', 'km2']], 3, 4, 90, 13], (a) => ({ km2: a.km2 }));
  map.setPaintProperty('parques', 'circle-opacity', .8);
  simple('aeropuertos', aer, css('--pt-aero'), ['match', ['get', 't'], 'Internacional/grande', 7, 'Mediano', 4.5, 2.2], (a) => ({ t: a.t }));
  const FC = { Gas: '#c07a2c', 'Hidráulica': '#2f6f8a', 'Petróleo': '#5b4a3a', Nuclear: '#8a3f7a', 'Eólica': '#4f9a8f', 'Carbón': '#333333', Solar: '#d9a31a', Otra: '#888888', Biomasa: '#6f8a3a' };
  map.addSource('centrales', { type: 'geojson', data: fc(cen.map((c, i) => pt(c.x, c.y, { i, mw: c.mw, f: c.f, n: c.n }))) });
  map.addLayer({ id: 'centrales', type: 'circle', source: 'centrales', layout: { visibility: 'none' }, paint: {
    'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'mw']], 0, 2.5, 10, 5, 45, 15],
    'circle-color': ['match', ['get', 'f'], ...Object.entries(FC).flat(), '#888'], 'circle-opacity': .85, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
  S.fuelColors = FC;
  map.addLayer({ id: 'hl-pt', type: 'circle', source: 'localidades', filter: ['==', ['get', 'i'], -1], paint: { 'circle-radius': 9, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': css('--focus'), 'circle-stroke-width': 2.5 } });
}

function addLabels() {
  for (const f of provGJ.features) {
    const el = document.createElement('div'); el.className = 'prov-label';
    el.textContent = S.data.provincias[f.properties.prov]?.nombre || '';
    if (f.properties.prov === '02') continue;
    const lp = { '06': [-60.5, -36.6], '94': [-67.6, -54.2], '86': [-63.4, -27.9], '10': [-67.3, -27.0], '90': [-65.35, -26.95], '38': [-65.8, -23.0], '66': [-64.5, -24.7], '46': [-67.3, -29.6], '70': [-68.9, -30.6], '74': [-66.1, -33.7], '62': [-67.3, -40.0], '78': [-70.2, -49.0], '26': [-68.7, -43.8], '42': [-65.5, -37.2] }[f.properties.prov] || labelPoint(f.geometry);
    labelMarkers.prov.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lp));
  }
  const cities = S.points.loc.filter((l) => l[2] >= 150000 && !/^(La Matanza|Lomas de Zamora|Quilmes|Almirante Brown|Merlo|Moreno|Lanús|Florencio Varela|General San Martín|Tres de Febrero|Tigre|Avellaneda|Berazategui|Malvinas Argentinas|Esteban Echeverría|José C. Paz|Morón|San Isidro|Vicente López|Ituzaingó|Hurlingham|Ezeiza|San Miguel|Pilar|Escobar|San Fernando|Presidente Perón|Marcos Paz)/.test(l[3]));
  for (const c of cities) {
    const el = document.createElement('div'); el.className = 'city-label'; el.textContent = c[3].replace('Ciudad Autónoma de Buenos Aires', 'Buenos Aires');
    labelMarkers.city.push(new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat([c[0], c[1]]));
  }
  const upd = () => {
    const z = map.getZoom();
    const showProv = z < 6.2 && S.level === 'p', showCity = z >= 5.2;
    labelMarkers.prov.forEach((m) => (showProv ? m.addTo(map) : m.remove()));
    labelMarkers.city.forEach((m) => (showCity ? m.addTo(map) : m.remove()));
  };
  map.on('zoomend', upd); S.updLabels = upd; upd();
}

const POINT_LAYERS = ['aglomerados', 'centrales', 'universidades', 'aeropuertos', 'puertos', 'parques', 'localidades', 'escuelas'];
function wireEvents() {
  const tip = document.getElementById('tip');
  let hovered = null;
  const clearHover = () => { if (hovered) map.setFeatureState(hovered, { hover: false }); hovered = null; };
  map.on('mousemove', (e) => {
    const pl = POINT_LAYERS.filter((l) => map.getLayoutProperty(l, 'visibility') === 'visible');
    const pf = pl.length ? map.queryRenderedFeatures(e.point, { layers: pl }) : [];
    if (pf.length) {
      clearHover(); const f = pf[0]; map.getCanvas().style.cursor = 'pointer';
      tip.innerHTML = pointTip(f.layer.id, f.properties); tip.hidden = false; tip.style.left = e.point.x + 'px'; tip.style.top = e.point.y + 'px';
      return;
    }
    const layer = S.level === 'd' ? 'deptos-fill' : 'prov-fill';
    const f = map.queryRenderedFeatures(e.point, { layers: [layer] })[0];
    if (!f) { clearHover(); tip.hidden = true; map.getCanvas().style.cursor = ''; return; }
    map.getCanvas().style.cursor = 'pointer';
    const src = S.level === 'd' ? 'deptos' : 'prov'; const id = f.id;
    if (!hovered || hovered.id !== id || hovered.source !== src) { clearHover(); hovered = { source: src, id }; map.setFeatureState(hovered, { hover: true }); }
    const rec = S.level === 'd' ? S.data.deptos[id] : S.data.provincias[id];
    const name = S.level === 'd' ? `${S.data.nombres[id]?.n} <span style="opacity:.7">· ${S.data.provincias[S.data.nombres[id]?.p]?.nombre}</span>` : S.data.provincias[id]?.nombre;
    const ind = BY_KEY[S.ind];
    tip.innerHTML = `<b>${name}</b>${ind ? `<br>${esc(ind.l)}: ${fmtK(S.ind, rec?.[S.ind])} ${rec?.[S.ind] != null ? esc(ind.u) : ''}` : ''}`;
    tip.hidden = false; tip.style.left = e.point.x + 'px'; tip.style.top = e.point.y + 'px';
  });
  map.on('mouseout', () => { clearHover(); tip.hidden = true; });
  map.on('click', (e) => {
    const pl = POINT_LAYERS.filter((l) => map.getLayoutProperty(l, 'visibility') === 'visible');
    const pf = pl.length ? map.queryRenderedFeatures(e.point, { layers: pl }) : [];
    if (pf.length) { H.selectPoint(pf[0].layer.id, pf[0].properties.i); return; }
    const layer = S.level === 'd' ? 'deptos-fill' : 'prov-fill';
    const f = map.queryRenderedFeatures(e.point, { layers: [layer] })[0];
    if (f) H.select(S.level, f.id, false);
  });
}
function pointTip(layer, p) {
  if (layer === 'localidades') return `<b>${esc(p.n)}</b><br>${fmt(p.pob)} habitantes`;
  if (layer === 'aglomerados') return `<b>${esc(p.n)}</b><br>Pobreza: ${fmt(p.v, 'd1')} % de las personas`;
  if (layer === 'centrales') return `<b>${esc(p.n)}</b><br>${esc(p.f)} · ${fmt(p.mw)} MW`;
  if (layer === 'escuelas') return `<b>${esc(p.n)}</b><br>${p.niv === 1 ? 'Secundaria' : 'Primaria'} · ${p.priv === 1 ? 'privada' : 'estatal'}`;
  if (layer === 'parques') return `<b>Parque Nacional ${esc(p.n.replace('Parque Nacional ', ''))}</b><br>${fmt(p.km2)} km²`;
  if (layer === 'aeropuertos') return `<b>${esc(p.n)}</b><br>${esc(p.t)}`;
  return `<b>${esc(p.n)}</b>`;
}

export function paint() {
  const lvl = S.level, ind = BY_KEY[S.ind];
  map.setLayoutProperty('deptos-fill', 'visibility', lvl === 'd' ? 'visible' : 'none');
  map.setLayoutProperty('prov-fill', 'visibility', lvl === 'p' ? 'visible' : 'none');
  map.setPaintProperty('deptos-ln', 'line-opacity', lvl === 'd' ? ['interpolate', ['linear'], ['zoom'], 3, .25, 6, .7] : ['interpolate', ['linear'], ['zoom'], 3, 0, 6, .35]);
  const recs = lvl === 'd' ? S.data.deptos : S.data.provincias;
  const src = lvl === 'd' ? 'deptos' : 'prov';
  const reliefOn = S.layers.has('relieve');
  map.setLayoutProperty('relieve', 'visibility', reliefOn ? 'visible' : 'none');
  if (!ind) {
    // sin indicador: sólo el mapa físico
    map.setPaintProperty(lvl === 'd' ? 'deptos-fill' : 'prov-fill', 'fill-opacity', reliefOn ? 0 : .5);
    for (const id in recs) map.setFeatureState({ source: src, id }, { c: reliefOn ? null : css('--paper') });
    S.breaks = null; return null;
  }
  map.setPaintProperty(lvl === 'd' ? 'deptos-fill' : 'prov-fill', 'fill-opacity', ['case', ['boolean', ['feature-state', 'hover'], false], .95, reliefOn ? .62 : .86]);
  const vals = Object.values(recs).map((r) => r[S.ind]);
  const br = breaks(vals, ind);
  for (const id in recs) map.setFeatureState({ source: src, id }, { c: colorFor(recs[id][S.ind], br) });
  S.breaks = br;
  S.updLabels && S.updLabels();
  return br;
}

export function setLayer(k, on) {
  const ids = k === 'rios' ? ['rios', 'lagos'] : [k];
  if (k === 'relieve') { paint(); return; }
  for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
}

export function highlight(level, id) {
  map.setFilter('sel-ln', ['==', ['get', 'id'], level === 'd' ? id : '']);
  map.setFilter('sel-prov-ln', ['==', ['get', 'prov'], level === 'p' ? id : '']);
}
export function highlightPoint(layer, i) {
  if (!layer) { map.setFilter('hl-pt', ['==', ['get', 'i'], -1]); return; }
  const lyr = map.getStyle().layers.find((l) => l.id === 'hl-pt');
  if (lyr.source !== layer) {
    map.removeLayer('hl-pt');
    map.addLayer({ id: 'hl-pt', type: 'circle', source: layer, filter: ['==', ['get', 'i'], i], paint: { 'circle-radius': 10, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': css('--focus'), 'circle-stroke-width': 2.5 } });
  } else map.setFilter('hl-pt', ['==', ['get', 'i'], i]);
}
export function flyToBbox(key) {
  const b = bboxes[key]; if (!b) return;
  map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60, maxZoom: 9, duration: 700 });
}
export function flyTo(x, y, z = 8) { map.flyTo({ center: [x, y], zoom: Math.max(map.getZoom(), z), duration: 700 }); }
export function resetView() { map.fitBounds([[-74, -55.5], [-53, -21.5]], { padding: 20, duration: 600 }); }
export function resize() { map && map.resize(); }
export { compact };
