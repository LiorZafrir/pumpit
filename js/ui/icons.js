// Line icons (stroke 2). Paths are static strings defined here, never user data.
const SVG_NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  home: ['M3 11.5 12 4l9 7.5', 'M5.5 10v9.5a1 1 0 0 0 1 1H10v-5.5h4v5.5h3.5a1 1 0 0 0 1-1V10'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
  bolt: ['M13 2 4 14h7l-1 8 9-12h-7l1-8Z'],
  alert: ['M12 3 2 20h20L12 3Z', 'M12 10v4', 'M12 17.2v.1'],
  google: ['M21 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3c1.8-1.6 2.9-4 2.9-6.7Z', 'M12 21c2.5 0 4.6-.8 6.1-2.3l-3-2.3c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H3.8v2.4A9 9 0 0 0 12 21Z', 'M6.9 13.5a5.4 5.4 0 0 1 0-3V8.1H3.8a9 9 0 0 0 0 8.1l3.1-2.7Z', 'M12 6.6c1.4 0 2.6.5 3.600 1.400l2.700-2.700A9 9 0 0 0 3.800 8.100l3.100 2.400C7.600 8.200 9.600 6.600 12 6.600Z'],
  logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 8l-4 4 4 4', 'M6 12h10'],
  dumbbell: ['M6.5 6.5v11', 'M17.5 6.5v11', 'M3.5 9v6', 'M20.5 9v6', 'M6.5 12h11']
};

export function icon(name, { size = 24, label = null } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  for (const d of PATHS[name] || []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
