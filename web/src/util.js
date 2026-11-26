import { BY_KEY } from './catalog.js';

const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmt(v, f = 'n') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (f === 'd1') return nf1.format(v);
  if (f === 'd2') return nf2.format(v);
  return nf0.format(v);
}
export function fmtK(k, v) { const i = BY_KEY[k]; return fmt(v, i ? i.f : 'n'); }
export function compact(v) {
  if (v === null || v === undefined) return '—';
  const a = Math.abs(v);
  if (a >= 1e9) return nf1.format(v / 1e9) + ' mil M';
  if (a >= 1e6) return nf1.format(v / 1e6) + ' M';
  if (a >= 1e4) return nf0.format(v / 1e3) + ' mil';
  return nf0.format(v);
}
export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const SEQ = () => [1, 2, 3, 4, 5, 6, 7].map((i) => css(`--seq-${i}`));
export const DIV = () => ['--div-neg-3', '--div-neg-2', '--div-neg-1', '--div-0', '--div-pos-1', '--div-pos-2', '--div-pos-3'].map(css);

// Cortes por cuantiles (7 clases) o divergentes alrededor de un centro
export function breaks(values, ind) {
  const v = values.filter((x) => x !== null && x !== undefined && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return { cuts: [], colors: SEQ(), min: 0, max: 0 };
  const min = v[0], max = v[v.length - 1];
  if (ind && ind.div !== undefined) {
    const c = ind.div;
    const neg = v.filter((x) => x < c), pos = v.filter((x) => x > c);
    const q = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] : c;
    const cuts = [q(neg, 1 / 3), q(neg, 2 / 3), c - 1e-9, c + 1e-9, q(pos, 1 / 3), q(pos, 2 / 3)];
    for (let i = 1; i < cuts.length; i++) if (cuts[i] <= cuts[i - 1]) cuts[i] = cuts[i - 1] + 1e-9;
    return { cuts, colors: DIV(), min, max, diverging: true, center: c };
  }
  const uniq = [...new Set(v)];
  const n = Math.min(7, uniq.length);
  const cuts = [];
  for (let i = 1; i < n; i++) {
    const x = v[Math.floor((i / n) * v.length)];
    if (!cuts.length || x > cuts[cuts.length - 1]) cuts.push(x);
  }
  const colors = SEQ();
  const pick = cuts.length + 1 === 7 ? colors : spread(colors, cuts.length + 1);
  return { cuts, colors: pick, min, max };
}
function spread(colors, n) {
  if (n <= 1) return [colors[4]];
  return Array.from({ length: n }, (_, i) => colors[Math.round((i * (colors.length - 1)) / (n - 1))]);
}
export function colorFor(v, br) {
  if (v === null || v === undefined) return null;
  let i = 0; while (i < br.cuts.length && v >= br.cuts[i]) i++;
  return br.colors[i];
}

export function download(name, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + text], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function norm(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
