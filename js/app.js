// Hash router: one screen at a time.
// Signed out -> login. Signed in without a finished profile -> onboarding. Otherwise the app.
import { finishRedirect, watchAuth } from './auth.js';
import { createProfile, getProfile } from './store.js';
import { buildProfile, isProfileComplete } from './logic/onboarding.js';
import { h } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { applyTheme } from './ui/theme.js';

const SCREENS = {
  login: () => import('./screens/login.js'),
  onboarding: () => import('./screens/onboarding.js'),
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
let profile = null;
let profileState = 'idle'; // idle | loading | ready | error
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

function showFullScreen(content) {
  root.classList.add('no-nav');
  nav.hidden = true;
  root.replaceChildren(content);
}

function loadErrorScreen() {
  const retry = h('button', { class: 'btn btn-primary', type: 'button' }, 'נסה שוב');
  retry.addEventListener('click', () => loadProfile(user));
  return h('section', { class: 'screen login' },
    h('div', { class: 'login-hero' },
      h('div', { class: 'logo-mark' }, icon('alert', { size: 44 })),
      h('h1', { class: 'display', style: 'font-size:28px' }, 'לא הצלחנו לטעון את הנתונים'),
      h('p', { class: 'muted' }, 'בדוק את החיבור לאינטרנט ונסה שוב.')),
    h('div', { class: 'login-actions' }, retry));
}

async function submitOnboarding(answers) {
  const data = buildProfile(answers, { name: user.displayName });
  await createProfile(user.uid, data); // throws on failure; the onboarding screen shows the error
  profile = data;
  applyTheme(data.theme);
  history.replaceState(null, '', '#/home');
  route();
}

async function route() {
  const token = ++renderToken;

  if (!authReady || (user && profileState !== 'ready' && profileState !== 'error')) {
    showFullScreen(h('div', { class: 'splash', 'aria-label': 'טוען' }, h('div', { class: 'pulse-dot' })));
    return;
  }

  let name;
  if (!user) {
    name = 'login';
  } else if (profileState === 'error') {
    showFullScreen(loadErrorScreen());
    return;
  } else if (!isProfileComplete(profile)) {
    name = 'onboarding';
  } else {
    name = currentName();
    if (name === 'login' || name === 'onboarding') name = 'home';
  }
  if (user && location.hash !== `#/${name}`) history.replaceState(null, '', `#/${name}`);

  const mod = await SCREENS[name]();
  if (token !== renderToken) return; // a newer navigation won

  const screen = mod.render({ user, profile, initialError: redirectError, onSubmit: submitOnboarding });
  redirectError = null;

  const showNav = name !== 'login' && name !== 'onboarding';
  root.classList.toggle('no-nav', !showNav);
  nav.hidden = !showNav;
  syncNav(name);
  root.replaceChildren(screen);
  window.scrollTo(0, 0);
  const titles = { login: 'PumpIt', onboarding: 'PumpIt · שאלון' };
  document.title = titles[name] || `PumpIt · ${NAV.find((n) => n.name === name).label}`;
}

async function loadProfile(forUser) {
  profileState = 'loading';
  route();
  try {
    const loaded = await getProfile(forUser.uid);
    if (user !== forUser) return; // signed out or switched account meanwhile
    profile = loaded;
    profileState = 'ready';
    if (loaded && loaded.theme) applyTheme(loaded.theme);
  } catch {
    if (user !== forUser) return;
    profileState = 'error';
  }
  route();
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
  profile = null;
  if (u) {
    loadProfile(u);
  } else {
    profileState = 'idle';
    applyTheme('lime');
    route();
  }
});
