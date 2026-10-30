import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

export function render() {
  return h('section', { class: 'screen' },
    h('header', { class: 'screen-head' }, h('h1', { class: 'screen-title' }, 'התקדמות')),
    h('div', { class: 'card empty' },
      icon('chart', { size: 40 }),
      h('h2', null, 'עוד אין נתונים'),
      h('p', null, 'הגרפים יופיעו אחרי האימון הראשון.')
    )
  );
}
