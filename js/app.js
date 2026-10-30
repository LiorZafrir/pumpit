// Hash router: one screen at a time. Signed-out users only ever see the login screen.
import { finishRedirect, watchAuth } from './auth.js';
import { h } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { applyTheme } from './ui/theme.js';

const SCREENS = {
  login: () => import('./screens/login.js'),
  home: () => import('./screens/home.js'),
  progress: () => import('./screens/progress.js'),
  profile: () => import('./screens/profile.js')
};

const NAV = [
  { name: 'home', label: 'בית', icon: 'home' },
  { name: 'progress', label: 'התקדמות', icon: 'chart' },
  { name: 'profile', label: 'פרופיל', icon: 'user' }
];

const root = document.getElementById('app');
const nav = document.getElementById('bottom-nav');

let user = null;
let authReady = false;
let redirectError = null;
let renderToken = 0;

function currentName() {
  const name = location.hash.replace(/^#\/?/, '');
  return SCREENS[name] ? name : 'home';
}

function buildNav() {
  nav.replaceChildren(
    ...NAV.map((item) =>
      h('a', { class: 'nav-item', href: `#/${item.name}`, 'data-name': item.name },
        icon(item.icon, { size: 24 }),
        h('span', null, item.label))
    )
  );
}

function syncNav(name) {
  for (const link of nav.children) {
    if (link.dataset.name === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

async function route() {
  const token = ++renderToken;

  if (!authReady) {
    root.classList.add('no-nav');
    nav.hidden = true;
    root.replaceChildren(h('div', { class: 'splash', 'aria-label': 'טוען' }, h('div', { class: 'pulse-dot' })));
    return;
  }

  let name = currentName();
  if (!user) name = 'login';
  else if (name === 'login') name = 'home';
  if (user && location.hash !== `#/${name}`) {
    history.replaceState(null, '', `#/${name}`);
  }

  const mod = await SCREENS[name]();
  if (token !== renderToken) return; // a newer navigation won

  const screen = mod.render({ user, initialError: redirectError });
  redirectError = null;

  const showNav = name !== 'login';
  root.classList.toggle('no-nav', !showNav);
  nav.hidden = !showNav;
  syncNav(name);
  root.replaceChildren(screen);
  window.scrollTo(0, 0);
  document.title = name === 'login' ? 'PumpIt' : `PumpIt · ${NAV.find((n) => n.name === name).label}`;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloaded = false;
  // When a new version takes over, reload once so the page and cache match.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

applyTheme(document.documentElement.dataset.theme);
buildNav();
window.addEventListener('hashchange', route);
route();
registerServiceWorker();

redirectError = await finishRedirect();
watchAuth((u) => {
  user = u;
  authReady = true;
  route();
});
