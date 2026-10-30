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
    signOutBtn,
    debugCard()
  );
}

// TEMPORARY: layout diagnostics for the iOS bottom-nav position. Remove once fixed.
function debugCard() {
  const probe = h('div', { style: 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom);padding-top:env(safe-area-inset-top)' });
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const nav = document.getElementById('bottom-nav').getBoundingClientRect();
  const vv = window.visualViewport;
  const lines = [
    `innerHeight ${window.innerHeight}`,
    `screen.height ${screen.height}`,
    `visualViewport.height ${vv ? Math.round(vv.height) : 'n/a'}`,
    `clientHeight ${document.documentElement.clientHeight}`,
    `safe top/bottom ${cs.paddingTop} / ${cs.paddingBottom}`,
    `nav bottom ${Math.round(nav.bottom)}`,
    `standalone ${window.navigator.standalone}`
  ];
  probe.remove();
  return h('div', { class: 'card small num', dir: 'ltr' }, ...lines.map((l) => h('div', null, l)));
}
