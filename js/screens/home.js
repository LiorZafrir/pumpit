import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

export function render() {
  return h('section', { class: 'screen' },
    h('header', { class: 'screen-head' }, h('h1', { class: 'screen-title' }, 'בית')),
    h('div', { class: 'card empty' },
      icon('dumbbell', { size: 40 }),
      h('h2', null, 'האימון של היום יופיע כאן'),
      h('p', null, 'מסך הבית נבנה בשלב 3.')
    )
  );
}
