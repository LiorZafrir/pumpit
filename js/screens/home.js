import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { MUSCLE_LABELS, SESSION_TITLES } from '../ui/labels.js';
import { exerciseById } from '../data/local-exercises.js';
import { doneDates, doneThisWeek, weeklyStreak } from '../logic/streak.js';
import { weekDays } from '../logic/week.js';
import { SHORT_OPTIONS } from '../logic/shortmode.js';
import { unlockAudio } from '../services/feedback.js';

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const LOCATIONS = [['gym', 'חדר כושר'], ['home', 'בית']];
const DURATIONS = [[null, 'מלא'], ...SHORT_OPTIONS.slice().reverse().map((m) => [m, String(m)])];

/** "כ-30 דק׳", rounded to 5 minutes. */
function approxMinutes(sec) {
  return `כ-${Math.max(5, Math.round(sec / 300) * 5)} דק׳`;
}

function dose(item) {
  if (item.durationSec) return `${item.sets} × ${item.durationSec} שנ׳`;
  return `${item.sets} × ${item.repsMin}-${item.repsMax}`;
}

/**
 * @param {{
 *   user: object, profile: object, workouts: object[], active: object|null,
 *   planNext: (location: string) => { next: { type: string }, plan: { exercises: object[], plannedSets: number } },
 *   actions: { setLocation: (l: string) => Promise<void>, start: (l: string) => object },
 *   navigate: (name: string) => void
 * }} ctx
 */
export function render({ user, profile, workouts, active, planNext, actions, navigate }) {
  let location = profile.lastLocation === 'home' ? 'home' : 'gym';
  let shortMin = null; // chosen per workout, not remembered

  const days = Math.min(6, Math.max(2, Number(profile.daysPerWeek) || 3));
  const now = new Date();
  const doneCount = doneThisWeek(workouts, now);
  const streak = weeklyStreak(workouts, days, now);
  const firstName = (profile.name || user.displayName || '').trim().split(/\s+/)[0];

  const week = h('div', { class: 'week', role: 'list', 'aria-label': 'השבוע' },
    ...weekDays(now, { done: doneDates(workouts) }).map((d) =>
      h('div', {
        class: `day${d.isToday ? ' today' : ''}${d.done ? ' done' : ''}`, role: 'listitem',
        'aria-current': d.isToday ? 'date' : null, 'aria-label': d.done ? 'אימון הושלם' : null
      },
      h('span', { class: 'day-letter' }, DAY_LETTERS[d.dayOfWeek]),
      h('span', { class: 'day-num num' }, String(d.dayOfMonth)))));

  const titleEl = h('h2', { class: 'workout-title' });
  const metaEl = h('p', { class: 'muted small num' });
  const listEl = h('ul', { class: 'exercise-list' });
  const errorSlot = h('div', { role: 'alert' });
  const startBtn = h('button', { class: 'btn btn-primary', type: 'button' });

  function rowsFor(exercises) {
    return exercises.map((item, i) => {
      const ex = exerciseById(item.exerciseId) || { name: item.name || 'תרגיל', muscle: item.muscle };
      const inPair = item.pair === true || exercises[i - 1]?.pair === true;
      return h('li', { class: `exercise-row${inPair ? ' in-pair' : ''}` },
        h('div', { class: 'exercise-main' },
          h('span', { class: 'exercise-name' }, ex.name),
          h('span', { class: 'muted small' }, [MUSCLE_LABELS[ex.muscle], inPair ? 'סופר סט' : ''].filter(Boolean).join(' · '))),
        h('span', { class: 'exercise-dose num', dir: 'ltr' }, dose(item)));
    });
  }

  function meta(count, sets, extra = '') {
    return count ? `${count === 1 ? 'תרגיל אחד' : `${count} תרגילים`} · ${sets} סטים${extra}` : 'לא נמצאו תרגילים מתאימים';
  }

  function drawPlan() {
    if (active) {
      titleEl.textContent = active.title || 'אימון פתוח';
      metaEl.textContent = `אימון בתהליך${active.shortMin ? ` · קצר, ${active.shortMin} דק׳` : ''} · ${meta(active.plan.length, active.plannedSets)}`;
      listEl.replaceChildren(...rowsFor(active.plan));
      startBtn.textContent = 'המשך אימון';
      startBtn.disabled = false;
      return;
    }
    const { next, plan } = planNext(location, shortMin);
    titleEl.textContent = SESSION_TITLES[next.type];
    metaEl.textContent = meta(plan.exercises.length, plan.plannedSets, ` · ${approxMinutes(plan.estimateSec)}`);
    listEl.replaceChildren(...(plan.exercises.length
      ? rowsFor(plan.exercises)
      : [h('li', { class: 'muted small' }, 'האזורים הרגישים שסימנת מוציאים את כל התרגילים. אפשר לעדכן אותם בפרופיל.')]));
    startBtn.textContent = 'התחל אימון';
    startBtn.disabled = plan.exercises.length === 0;
  }

  startBtn.addEventListener('click', () => {
    unlockAudio();
    errorSlot.replaceChildren();
    try {
      if (!active) actions.start(location, { shortMin });
      navigate('workout');
    } catch {
      errorSlot.replaceChildren(h('div', { class: 'error-msg' }, icon('alert', { size: 20 }), h('span', null, 'לא הצלחנו להתחיל את האימון. נסה שוב.')));
    }
  });

  const segButtons = LOCATIONS.map(([value, label]) => {
    const btn = h('button', { class: 'seg', type: 'button', role: 'radio', 'aria-checked': String(location === value), disabled: Boolean(active) }, label);
    btn.addEventListener('click', async () => {
      if (location === value) return;
      location = value;
      for (const b of segButtons) b.setAttribute('aria-checked', String(b === btn));
      errorSlot.replaceChildren();
      drawPlan();
      try {
        await actions.setLocation(value);
      } catch {
        errorSlot.replaceChildren(h('div', { class: 'error-msg' }, icon('alert', { size: 20 }), h('span', null, 'לא הצלחנו לשמור את הבחירה. היא תישאר רק עד שתסגור את האפליקציה.')));
      }
    });
    return btn;
  });

  const durationButtons = DURATIONS.map(([value, label]) => {
    const btn = h('button', { class: 'seg', type: 'button', role: 'radio', 'aria-checked': String(shortMin === value), disabled: Boolean(active) }, label);
    btn.addEventListener('click', () => {
      if (shortMin === value) return;
      shortMin = value;
      for (const b of durationButtons) b.setAttribute('aria-checked', String(b === btn));
      drawPlan();
    });
    return btn;
  });

  drawPlan();

  return h('section', { class: 'screen home' },
    h('header', { class: 'home-head' },
      h('div', null,
        h('p', { class: 'muted' }, 'היי,'),
        h('h1', { class: 'screen-title' }, firstName || 'ברוך הבא')),
      h('div', { class: 'streak', 'aria-label': `רצף של ${streak} שבועות` }, icon('bolt', { size: 20 }), h('span', { class: 'num' }, String(streak)))),
    week,
    h('div', { class: 'card strong workout-card' },
      h('div', { class: 'row' },
        h('span', { class: 'muted small' }, active ? 'אימון פתוח' : 'האימון של היום'),
        h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'מיקום האימון' }, ...segButtons)),
      errorSlot,
      active ? null : h('div', { class: 'row duration-row' },
        h('span', { class: 'muted small' }, 'כמה זמן יש לך? (דקות)'),
        h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'משך האימון' }, ...durationButtons)),
      h('div', null, titleEl, metaEl),
      listEl,
      startBtn),
    h('div', { class: 'card stat' },
      h('div', { class: 'row' },
        h('span', null, 'אימונים השבוע'),
        h('span', { class: 'num stat-value' }, `${doneCount} / ${days}`)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'אימונים השבוע', 'aria-valuemin': 0, 'aria-valuemax': days, 'aria-valuenow': Math.min(doneCount, days) },
        h('span', { style: `width:${Math.min(1, doneCount / days) * 100}%` }))));
}
