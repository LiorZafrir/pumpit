// Safe element builder. Children are appended as text nodes, never parsed as HTML,
// so user-controlled strings can't inject markup.
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

export function clear(el) {
  el.replaceChildren();
}
