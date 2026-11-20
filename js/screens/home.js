import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { MUSCLE_LABELS, SESSION_TITLES } from '../ui/labels.js';
import { exerciseById } from '../data/local-exercises.js';
import { doneDates, doneThisWeek, weeklyStreak } from '../logic/streak.js';
import { weekDays } from '../logic/week.js';
import { LONG_OPTIONS, MAX_EXERCISES, SHORT_OPTIONS } from '../logic/shortmode.js';
import { addableExercises, addPlanItem, alternativesFor, rePair, removePlanItem, swapPlanItem } from '../logic/swap.js';
import { estimateEdited } from '../logic/compose.js';
import { settingsOf } from '../logic/settings.js';
import { FOCUS_LABELS, FOCUS_OPTIONS, focusTitle, normalizeFocus } from '../logic/focus.js';
import { openSheet } from '../ui/sheet.js';
import { unlockAudio } from '../services/feedback.js';

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const LOCATIONS = [['gym', 'חדר כושר'], ['home', 'בית']];
const DURATIONS = [[null, 'רגיל'], ...[...SHORT_OPTIONS, ...LONG_OPTIONS].map((m) => [m, String(m)])];

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
  let minutes = null; // chosen per workout, not remembered
  let focus = []; // areas picked instead of the planned session, also per workout
  let custom = null; // the exercise list after the user's own edits; any change of place, time or focus starts over
  let suggested = []; // what the app suggested last, to know whether supersets were part of it

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
  const focusLabel = h('span', { class: 'focus-label' });
  const metaEl = h('p', { class: 'muted small num' });
  const listEl = h('ul', { class: 'exercise-list' });
  const errorSlot = h('div', { role: 'alert' });
  const startBtn = h('button', { class: 'btn btn-primary', type: 'button' });

  const planContext = () => {
    const st = settingsOf(profile);
    return { location, level: profile.level, goal: profile.goal, injuries: Array.isArray(profile.injuries) ? profile.injuries : [], gear: st.homeGear, style: st.homeStyle };
  };

  function rowsFor(exercises, editable = false) {
    return exercises.map((item, i) => {
      const ex = exerciseById(item.exerciseId) || { name: item.name || 'תרגיל', muscle: item.muscle };
      const inPair = item.pair === true || exercises[i - 1]?.pair === true;
      const content = [
        h('div', { class: 'exercise-main' },
          h('span', { class: 'exercise-name' }, ex.name),
          h('span', { class: 'muted small' }, MUSCLE_LABELS[ex.muscle]),
          inPair ? h('span', { class: 'pair-tag' }, item.pair === true ? 'סופר סט · א׳' : 'סופר סט · ב׳') : null),
        h('span', { class: 'exercise-dose num', dir: 'ltr' }, dose(item))];
      if (!editable) return h('li', { class: `exercise-row${inPair ? ' in-pair' : ''}` }, ...content);
      const edit = h('button', { class: 'exercise-edit', type: 'button', 'aria-label': `עריכת ${ex.name}` }, ...content, icon('more', { size: 20 }));
      edit.addEventListener('click', () => openRowSheet(i));
      return h('li', { class: `exercise-row${inPair ? ' in-pair' : ''}` }, edit);
    });
  }

  // ---- editing the list before the workout starts ----

  const shownList = () => custom || suggested;
  const wantsPairs = () => settingsOf(profile).superset || suggested.some((e) => e.pair);
  function edit(list) {
    custom = rePair(list, wantsPairs());
    errorSlot.replaceChildren();
    drawPlan();
  }

  function openRowSheet(index) {
    const list = shownList();
    const item = list[index];
    const ex = exerciseById(item.exerciseId);
    const sheet = openSheet({ title: ex ? ex.name : 'תרגיל' });
    const alts = alternativesFor(list, index, planContext());
    const swap = h('button', { class: 'btn btn-primary', type: 'button', disabled: alts.length === 0 }, icon('swap', { size: 20 }), h('span', null, 'החלף בתרגיל אחר'));
    swap.addEventListener('click', () => { sheet.close(); openSwapSheet(index, alts); });
    const remove = h('button', { class: 'btn btn-ghost btn-danger-text', type: 'button' }, 'הסר מהאימון');
    remove.addEventListener('click', () => { sheet.close(); edit(removePlanItem(list, index)); });
    sheet.body.append(
      alts.length ? null : h('p', { class: 'sheet-text' }, 'אין תרגיל חלופי לאותו שריר שמתאים למיקום, לרמה ולאזורים הרגישים שלך.'),
      h('div', { class: 'sheet-actions' }, swap, remove));
  }

  function chooserRow(ex, label, onPick) {
    const where = ex.location.length === 2 ? 'חדר כושר או בית' : ex.location[0] === 'gym' ? 'חדר כושר' : 'בית';
    const row = h('button', { class: 'swap-row', type: 'button' },
      h('span', { class: 'swap-text' }, h('span', { class: 'swap-name' }, ex.name), h('span', { class: 'small muted' }, `${MUSCLE_LABELS[ex.muscle]} · ${where}`)),
      h('span', { class: 'swap-pill' }, label));
    row.addEventListener('click', onPick);
    return row;
  }

  function openSwapSheet(index, alts) {
    const sheet = openSheet({ title: 'החלפת תרגיל' });
    const list = shownList();
    const { goal, level } = planContext();
    sheet.body.append(
      h('p', { class: 'sheet-text' }, 'בחר תרגיל חלופי לאותו שריר.'),
      h('div', { class: 'swap-list' }, ...alts.map((alt) => chooserRow(alt, 'החלף', () => {
        sheet.close();
        edit(swapPlanItem(list, index, alt, { goal, level }));
      }))));
  }

  function openAddSheet() {
    const list = shownList();
    const options = addableExercises(list, planContext());
    const { goal, level } = planContext();
    const sheet = openSheet({ title: 'הוספת תרגיל' });
    sheet.body.append(options.length
      ? h('div', { class: 'swap-list' }, ...options.map((ex) => chooserRow(ex, 'הוסף', () => {
        sheet.close();
        edit(addPlanItem(list, ex, { goal, level }));
      })))
      : h('p', { class: 'sheet-text' }, 'אין עוד תרגילים שמתאימים למיקום, לרמה ולאזורים הרגישים שלך.'));
  }

  const addBtn = h('button', { class: 'btn btn-ghost', type: 'button' }, icon('plus', { size: 20 }), h('span', null, 'הוסף תרגיל'));
  addBtn.addEventListener('click', openAddSheet);
  const resetBtn = h('button', { class: 'btn btn-ghost', type: 'button', hidden: true }, 'חזרה לאימון המוצע');
  resetBtn.addEventListener('click', () => { custom = null; errorSlot.replaceChildren(); drawPlan(); });

  function meta(count, sets, extra = '') {
    return count ? `${count === 1 ? 'תרגיל אחד' : `${count} תרגילים`} · ${sets} סטים${extra}` : 'לא נמצאו תרגילים מתאימים';
  }

  function drawPlan() {
    if (active) {
      titleEl.textContent = active.title || 'אימון פתוח';
      metaEl.textContent = `אימון בתהליך${active.shortMin ? ` · קצר, ${active.shortMin} דק׳` : active.longMin ? ` · ארוך, ${active.longMin} דק׳` : ''} · ${meta(active.plan.length, active.plannedSets)}`;
      listEl.replaceChildren(...rowsFor(active.plan));
      addBtn.hidden = true;
      resetBtn.hidden = true;
      startBtn.textContent = 'המשך אימון';
      startBtn.disabled = false;
      return;
    }
    const { next, plan } = planNext(location, { minutes, focus });
    suggested = plan.exercises;
    const shown = shownList();
    const sets = shown.reduce((sum, e) => sum + e.sets, 0);
    const estimate = custom ? estimateEdited({ profile, exercises: shown, minutes }) : plan.estimateSec;
    titleEl.textContent = next.title || SESSION_TITLES[next.type];
    focusLabel.textContent = focus.length ? focusTitle(focus) : 'לפי התוכנית';
    metaEl.textContent = meta(shown.length, sets, ` · ${approxMinutes(estimate)}`);
    listEl.replaceChildren(...(shown.length
      ? rowsFor(shown, true)
      : [h('li', { class: 'muted small' }, custom ? 'לא נשארו תרגילים באימון. אפשר להוסיף תרגיל או לחזור לאימון המוצע.' : 'האזורים הרגישים שסימנת מוציאים את כל התרגילים. אפשר לעדכן אותם בפרופיל.')]));
    addBtn.hidden = shown.length >= MAX_EXERCISES;
    resetBtn.hidden = !custom;
    startBtn.textContent = 'התחל אימון';
    startBtn.disabled = shown.length === 0;
  }

  startBtn.addEventListener('click', () => {
    unlockAudio();
    errorSlot.replaceChildren();
    try {
      if (!active) actions.start(location, { minutes, focus, exercises: custom });
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
      custom = null;
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
    const btn = h('button', { class: 'seg', type: 'button', role: 'radio', 'aria-checked': String(minutes === value), disabled: Boolean(active) }, label);
    btn.addEventListener('click', () => {
      if (minutes === value) return;
      minutes = value;
      custom = null;
      for (const b of durationButtons) b.setAttribute('aria-checked', String(b === btn));
      drawPlan();
    });
    return btn;
  });

  function openFocusSheet() {
    const sheet = openSheet({ title: 'מה מתאמנים היום?' });
    const picked = new Set(normalizeFocus(focus));
    const chips = FOCUS_OPTIONS.map((area) => {
      const chip = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(picked.has(area)) }, FOCUS_LABELS[area]);
      chip.addEventListener('click', () => {
        if (picked.has(area)) picked.delete(area); else picked.add(area);
        chip.setAttribute('aria-pressed', String(picked.has(area)));
      });
      return chip;
    });
    const apply = h('button', { class: 'btn btn-primary', type: 'button' }, 'אישור');
    const reset = h('button', { class: 'btn btn-ghost', type: 'button' }, 'חזרה לאימון לפי התוכנית');
    apply.addEventListener('click', () => { focus = normalizeFocus([...picked]); custom = null; sheet.close(); drawPlan(); });
    reset.addEventListener('click', () => { focus = []; custom = null; sheet.close(); drawPlan(); });
    sheet.body.append(
      h('p', { class: 'sheet-text' }, 'אפשר לבחור כמה אזורים ביחד. האימון הזה לא ישנה את סדר האימונים של התוכנית.'),
      h('div', { class: 'chips', role: 'group', 'aria-label': 'אזורי אימון' }, ...chips),
      h('div', { class: 'sheet-actions' }, apply, reset));
  }

  const focusBtn = h('button', { class: 'focus-btn', type: 'button', disabled: Boolean(active) },
    h('span', { class: 'muted small' }, 'מה מתאמנים?'), focusLabel, h('span', { class: 'focus-change' }, 'שינוי'));
  focusBtn.addEventListener('click', openFocusSheet);

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
      active ? null : focusBtn,
      active ? null : h('div', { class: 'row duration-row' },
        h('span', { class: 'muted small' }, 'כמה זמן? (דקות)'),
        h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'משך האימון' }, ...durationButtons)),
      h('div', null, titleEl, metaEl),
      listEl,
      addBtn,
      resetBtn,
      startBtn),
    h('div', { class: 'card stat' },
      h('div', { class: 'row' },
        h('span', null, 'אימונים השבוע'),
        h('span', { class: 'num stat-value' }, `${doneCount} / ${days}`)),
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'אימונים השבוע', 'aria-valuemin': 0, 'aria-valuemax': days, 'aria-valuenow': Math.min(doneCount, days) },
        h('span', { style: `width:${Math.min(1, doneCount / days) * 100}%` }))));
}
