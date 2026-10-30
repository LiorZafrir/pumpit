import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { signOutUser } from '../auth.js';

export function render({ user }) {
  const signOutBtn = h('button', { class: 'btn btn-ghost', type: 'button' }, icon('logout', { size: 20 }), 'התנתקות');
  signOutBtn.addEventListener('click', () => signOutUser());

  return h('section', { class: 'screen' },
    h('header', { class: 'screen-head' }, h('h1', { class: 'screen-title' }, 'פרופיל')),
    h('div', { class: 'card stack' },
      h('div', { class: 'row' },
        h('span', { class: 'muted' }, 'שם'),
        h('span', null, user.displayName || '')
      ),
      h('div', { class: 'row' },
        h('span', { class: 'muted' }, 'אימייל'),
        h('span', { dir: 'ltr' }, user.email || '')
      )
    ),
    signOutBtn
  );
}
