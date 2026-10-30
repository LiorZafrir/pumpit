const SVG_NS = 'http://www.w3.org/2000/svg';

/** A circular progress ring. set(fraction) takes 0..1 and fills clockwise from the top. */
export function createRing({ size = 260, stroke = 14 } = {}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ring');

  const make = (cls) => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', size / 2);
    c.setAttribute('cy', size / 2);
    c.setAttribute('r', r);
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke-width', stroke);
    c.setAttribute('stroke-linecap', 'round');
    c.setAttribute('class', cls);
    return c;
  };
  const track = make('ring-track');
  const fill = make('ring-fill');
  fill.setAttribute('stroke-dasharray', String(circumference));
  fill.setAttribute('stroke-dashoffset', '0');
  fill.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
  svg.append(track, fill);

  return {
    el: svg,
    set(fraction) {
      const f = Math.min(1, Math.max(0, fraction));
      fill.setAttribute('stroke-dashoffset', String(circumference * (1 - f)));
    }
  };
}
