import { h } from './dom.js';
import { icon } from './icons.js';

/**
 * Bottom sheet. Returns { close, body } where body is the element to fill.
 * @param {{ title: string, onClose?: () => void }} opts
 */
export function openSheet({ title, onClose }) {
  const previouslyFocused = document.activeElement;
  const body = h('div', { class: 'sheet-body' });
  const closeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'סגירה' }, icon('close', { size: 20 }));
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    h('div', { class: 'sheet-head' }, h('h2', { class: 'sheet-title' }, title), closeBtn),
    body);
  const backdrop = h('div', { class: 'sheet-backdrop' }, sheet);
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    document.body.classList.remove('sheet-open');
    backdrop.remove();
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    if (onClose) onClose();
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  document.body.classList.add('sheet-open');
  document.body.append(backdrop);
  closeBtn.focus();
  return { close, body };
}
