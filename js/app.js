// Hash router: one screen at a time.
// Signed out -> login. Signed in without a finished profile -> onboarding. Otherwise the app.
import { clearDeletePending, consumeDeletePending, finishRedirect, watchAuth } from './auth.js';
import { createProfile } from './store.js';
import { actions, clearSession, finishDeletion, loadAll, onSyncError, planNext, session } from './session.js';
import { buildProfile, isProfileComplete } from './logic/onboarding.js';
import { activeWorkout } from './logic/streak.js';
import { h } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { applyTheme } from './ui/theme.js';
import { preventDoubleTapZoom } from './ui/touch.js';

const SCREENS = {
  login: () => import('./screens/login.js'),
  onboarding: () => import('./screens/onboarding.js'),
  home: () => import('./screens/home.js'),
  workout: () => import('./screens/workout.js'),
  summary: () => import('./screens/summary.js'),
  progress: () => import('./screens/progress.js'),
  profile: () => import('./screens/profile.js')
};

const NAV = [
  { name: 'home', label: 'בית', icon: 'home' },
  { name: 'progress', label: 'התקדמות', icon: 'chart' },
  { name: 'profile', label: 'פרופיל', icon: 'user' }
];
const FULL_SCREEN = new Set(['login', 'onboarding', 'workout', 'summary']);
const TITLES = { login: 'PumpIt', onboarding: 'PumpIt · שאלון', workout: 'PumpIt · אימון', summary: 'PumpIt · סיכום' };

const root = document.getElementById('app');
const nav = document.getElementById('bottom-nav');

let user = null;
let authReady = false;
let redirectError = null;
let profileState = 'idle'; // idle | loading | ready | error
let renderToken = 0;

const navigate = (name) => { location.hash = `#/${name}`; };

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
  actions.setProfile(data);
  actions.logBodyWeight(data.weightKg); // the first point of the body-weight chart (not awaited, works offline)
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
  } else if (!isProfileComplete(session.profile)) {
    name = 'onboarding';
  } else {
    name = currentName();
    if (name === 'login' || name === 'onboarding') name = 'home';
    try {
      if (name === 'workout' && !(await actions.resume())) name = 'home';
    } catch {
      name = 'home';
    }
    if (name === 'summary' && !session.summary) name = 'home';
    if (token !== renderToken) return;
  }
  if (user && location.hash !== `#/${name}`) history.replaceState(null, '', `#/${name}`);

  const mod = await SCREENS[name]();
  if (token !== renderToken) return; // a newer navigation won

  const screen = mod.render({
    user,
    profile: session.profile,
    workouts: session.workouts,
    active: activeWorkout(session.workouts),
    workout: session.active,
    states: session.states,
    summary: session.summary,
    planNext,
    actions,
    navigate,
    initialError: redirectError,
    onSubmit: submitOnboarding
  });
  redirectError = null;

  const showNav = !FULL_SCREEN.has(name);
  root.classList.toggle('no-nav', !showNav);
  nav.hidden = !showNav;
  syncNav(name);
  root.replaceChildren(screen);
  window.scrollTo(0, 0);
  document.title = TITLES[name] || `PumpIt · ${NAV.find((n) => n.name === name).label}`;
}

async function loadProfile(forUser) {
  profileState = 'loading';
  route();
  try {
    const loaded = await loadAll(forUser);
    if (user !== forUser) return; // signed out or switched account meanwhile
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
  // When a new version takes over, reload once so the page and cache match. Never mid-workout.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || session.active) return;
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

preventDoubleTapZoom();
applyTheme(document.documentElement.dataset.theme);
buildNav();
window.addEventListener('hashchange', route);
route();
registerServiceWorker();

onSyncError(() => {
  const banner = h('div', { class: 'error-msg sync-banner', role: 'alert' }, icon('alert', { size: 20 }), h('span', null, 'חלק מהנתונים לא נשמרו בשרת. בדוק את החיבור.'));
  document.querySelector('.sync-banner')?.remove();
  document.body.append(banner);
  setTimeout(() => banner.remove(), 8000);
});

// Coming back from Google's confirmation for "delete my account": finish the deletion. If it fails, the
// profile is still there (it is deleted last), so the user lands in the app and can try again.
async function resumeDeletion(u) {
  try {
    await finishDeletion(u);
  } catch {
    if (user === u) loadProfile(u);
  }
}

redirectError = await finishRedirect();
if (redirectError) clearDeletePending();
watchAuth((u) => {
  user = u;
  authReady = true;
  clearSession();
  if (u && consumeDeletePending()) {
    profileState = 'idle';
    route();
    resumeDeletion(u);
  } else if (u) {
    loadProfile(u);
  } else {
    profileState = 'idle';
    applyTheme('lime');
    route();
  }
});
