import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { planWorkout, nextSession } from '../logic/planner.js';
import { recommendedSplit } from '../logic/split.js';
import { weekDays } from '../logic/week.js';

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const SESSION_TITLES = {
  fullBody: 'אימון גוף מלא', upper: 'אימון פלג עליון', lower: 'אימון פלג תחתון',
  push: 'אימון דחיפה', pull: 'אימון משיכה', legs: 'אימון רגליים'
};
const MUSCLE_LABELS = {
  chest: 'חזה', back: 'גב', shoulders: 'כתפיים', rear: 'כתף אחורית', biceps: 'יד קדמית',
  triceps: 'יד אחורית', quads: 'רגל קדמית', hamstrings: 'רגל אחורית', glutes: 'ישבן', calves: 'תאומים', core: 'בטן'
};
const LOCATIONS = [['gym', 'חדר כושר'], ['home', 'בית']];

function dose(item) {
  if (item.durationSec) return `${item.sets} × ${item.durationSec} שנ׳`;
  return `${item.sets} × ${item.repsMin}-${item.repsMax}`;
}

/** @param {{ user: object, profile: object, onLocationChange: (loc: 'gym'|'home') => Promise<void> }} ctx */
export function render({ user, profile, onLocationChange }) {
  let location = profile.lastLocation === 'home' ? 'home' : 'gym';

  const days = Math.min(6, Math.max(2, Number(profile.daysPerWeek) || 3));
  const split = recommendedSplit(days);
  const completedCount = 0; // becomes real in stage 4, when workouts are saved
  const next = nextSession(split, completedCount);

  const firstName = (profile.name || user.displayName || '').trim().split(/\s+/)[0];
  const doneThisWeek = 0;

  const week = h('div', { class: 'week', role: 'list', 'aria-label': 'השבוע' },
    ...weekDays(new Date()).map((d) =>
      h('div', { class: `day${d.isToday ? ' today' : ''}${d.done ? ' done' : ''}`, role: 'listitem', 'aria-current': d.isToday ? 'date' : null },
        h('span', { class: 'day-letter' }, DAY_LETTERS[d.dayOfWeek]),
        h('span', { class: 'day-num num' }, String(d.dayOfMonth)))));

  const titleEl = h('h2', { class: 'workout-title' });
  const metaEl = h('p', { class: 'muted small num' });
  const listEl = h('ul', { class: 'exercise-list' });
  const errorSlot = h('div', { role: 'alert' });

  function drawPlan() {
    const plan = planWorkout({
      sessionType: next.type, location, goal: profile.goal, level: profile.level,
      injuries: Array.isArray(profile.injuries) ? profile.injuries : [], variant: next.variant
    });
    titleEl.textContent = SESSION_TITLES[next.type];
    const count = plan.exercises.length;
    metaEl.textContent = count
      ? `${count === 1 ? 'תרגיל אחד' : `${count} תרגילים`} · ${plan.plannedSets} סטים`
      : 'לא נמצאו תרגילים מתאימים';
    listEl.replaceChildren(...plan.exercises.map((item) =>
      h('li', { class: 'exercise-row' },
        h('div', { class: 'exercise-main' },
          h('span', { class: 'exercise-name' }, item.name),
          h('span', { class: 'muted small' }, MUSCLE_LABELS[item.muscle])),
        h('span', { class: 'exercise-dose num', dir: 'ltr' }, dose(item)))));
    if (!plan.exercises.length) {
      listEl.replaceChildren(h('li', { class: 'muted small' }, 'האזורים הרגישים שסימנת מוציאים את כל התרגילים. אפשר לעדכן אותם בפרופיל.'));
    }
  }

  const segButtons = LOCATIONS.map(([value, label]) => {
    const btn = h('button', { class: 'seg', type: 'button', role: 'radio', 'aria-checked': String(location === value) }, label);
    btn.addEventListener('click', async () => {
      if (location === value) return;
      location = value;
      for (const b of segButtons) b.setAttribute('aria-checked', String(b === btn));
      errorSlot.replaceChildren();
      drawPlan();
      try {
        await onLocationChange(value);
      } catch {
        errorSlot.replaceChildren(h('div', { class: 'error-msg' }, icon('alert', { size: 20 }), h('span', null, 'לא הצלחנו לשמור את הבחירה. היא תישאר רק עד שתסגור את האפליקציה.')));
      }
    });
    return btn;
  });

  const startBtn = h('button', { class: 'btn btn-primary', type: 'button', disabled: true }, 'התחל אימון');

  drawPlan();

  return h('section', { class: 'screen home' },
    h('header', { class: 'home-head' },
      h('div', null,
        h('p', { class: 'muted' }, 'היי,'),
        h('h1', { class: 'screen-title' }, firstName || 'ברוך הבא')),
      h('div', { class: 'streak', 'aria-label': 'רצף אימונים: 0' }, icon('bolt', { size: 20 }), h('span', { class: 'num' }, '0'))),
    week,
    h('div', { class: 'card strong workout-card' },
      h('div', { class: 'row' },
        h('span', { class: 'muted small' }, 'האימון של היום'),
        h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'מיקום האימון' }, ...segButtons)),
      errorSlot,
      h('div', null, titleEl, metaEl),
      listEl,
      startBtn,
      h('p', { class: 'muted small center' }, 'זרימת האימון תיבנה בשלב הבא.')),
    h('div', { class: 'card stat' },
      h('div', { class: 'row' },
        h('span', null, 'אימונים השבוע'),
        h('span', { class: 'num stat-value' }, `${doneThisWeek} / ${days}`)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'אימונים השבוע', 'aria-valuemin': 0, 'aria-valuemax': days, 'aria-valuenow': doneThisWeek },
        h('span', { style: `width:${(doneThisWeek / days) * 100}%` }))));
}
