// A small line chart as inline SVG. Time runs left to right even in the RTL app (charts read that way).
// Built with createElementNS only: no HTML strings, nothing from data reaches markup.
import { h } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340;
const H = 190;
const PAD = { left: 46, right: 14, top: 14, bottom: 34 };

const el = (tag, attrs = {}, text) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text != null) node.textContent = text;
  return node;
};

/**
 * @param {object} p
 * @param {{ at: number, value: number }[]} p.points oldest first
 * @param {{ x1: number, y1: number, x2: number, y2: number }|null} [p.trend] dashed line
 * @param {(n: number) => string} p.formatY
 * @param {(at: number) => string} p.formatX
 * @param {string} p.label accessible description
 */
export function lineChart({ points, trend = null, formatY, formatX, label }) {
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': label });
  if (!points.length) return h('div', { class: 'chart-wrap', dir: 'ltr' }, svg);

  const ys = points.map((p) => p.value).concat(trend ? [trend.y1, trend.y2] : []);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (hi - lo < 1) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;

  const t0 = points[0].at;
  const t1 = points[points.length - 1].at;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (at) => PAD.left + (t1 === t0 ? innerW / 2 : ((at - t0) / (t1 - t0)) * innerW);
  const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;

  for (const v of [lo + pad, (lo + hi) / 2, hi - pad]) {
    svg.append(
      el('line', { class: 'chart-grid', x1: PAD.left, x2: W - PAD.right, y1: y(v), y2: y(v) }),
      el('text', { class: 'chart-label', x: PAD.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, formatY(v)));
  }
  svg.append(
    el('text', { class: 'chart-label', x: PAD.left, y: H - 10, 'text-anchor': 'start' }, formatX(t0)),
    ...(t1 !== t0 ? [el('text', { class: 'chart-label', x: W - PAD.right, y: H - 10, 'text-anchor': 'end' }, formatX(t1))] : []));

  if (trend) svg.append(el('line', { class: 'chart-trend', x1: x(trend.x1), y1: y(trend.y1), x2: x(trend.x2), y2: y(trend.y2) }));
  if (points.length > 1) {
    svg.append(el('polyline', { class: 'chart-line', points: points.map((p) => `${x(p.at)},${y(p.value)}`).join(' ') }));
  }
  for (const p of points) svg.append(el('circle', { class: 'chart-dot', cx: x(p.at), cy: y(p.value), r: points.length > 40 ? 2 : 4 }));

  return h('div', { class: 'chart-wrap', dir: 'ltr' }, svg);
}
