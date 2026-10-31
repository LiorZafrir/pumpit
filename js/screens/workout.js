// The running workout: exercise view -> log-set sheet -> rest -> next set, until everything is done.
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { createRing } from '../ui/ring.js';
import { openSheet } from '../ui/sheet.js';
import { MUSCLE_LABELS, formatClock } from '../ui/labels.js';
import { exerciseMedia } from '../ui/exercise-media.js';
import { exerciseById } from '../data/local-exercises.js';
import { guideFor } from '../data/exercise-guides.js';
import { DEFAULT_REST_SEC, nextUp, positionFrom, progressFraction } from '../logic/workout-state.js';
import { beep, keepAwake, releaseAwake, unlockAudio, vibrate } from '../services/feedback.js';

const WEIGHT_STEP = 2.5;
const REST_ADJUST_SEC = 15;

const round1 = (n) => Math.round(n * 10) / 10;
const fmt = (n) => String(round1(n));
// LRM after the Hebrew unit keeps "65 ק״ג × 9" in reading order inside a left-to-right run.
const kg = (n) => `${fmt(n)} ק״ג‎`;

function stepper({ label, value, step, min, max, unit }) {
  let current = value;
  const input = h('input', {
    type: 'number', inputmode: step % 1 ? 'decimal' : 'numeric', step: String(step), min, max,
    value: fmt(current), 'aria-label': label, enterkeyhint: 'done'
  });
  const set = (v) => {
    current = Math.min(max, Math.max(min, round1(v)));
    input.value = fmt(current);
  };
  const btn = (name, glyph, delta) => {
    const b = h('button', { class: 'step-btn', type: 'button', 'aria-label': `${name} ${label}` }, icon(glyph, { size: 26 }));
    b.addEventListener('click', () => set(current + delta));
    return b;
  };
  input.addEventListener('change', () => {
    const n = Number(input.value);
    set(Number.isFinite(n) && input.value.trim() !== '' ? n : current);
  });
  return {
    el: h('div', { class: 'stepper' },
      h('span', { class: 'stepper-label' }, label),
      h('div', { class: 'stepper-row', dir: 'ltr' }, btn('הפחת', 'minus', -step), h('div', { class: 'stepper-value' }, input, h('span', { class: 'unit' }, unit)), btn('הוסף', 'plus', step))),
    get: () => current
  };
}

/**
 * @param {{
 *   workout: { id: string, doc: object, sets: object[] },
 *   states: Record<string, object>,
 *   actions: { recordSet: Function, finish: Function, discard: Function, alternatives: Function, swapExercise: Function },
 *   navigate: (name: string) => void
 * }} ctx
 */
export function render({ workout, states, actions, navigate }) {
  const plan = workout.doc.plan;
  const root = h('section', { class: 'screen workout' });
  let restTimer = null;

  keepAwake();

  const stopRest = () => {
    if (restTimer) clearInterval(restTimer);
    restTimer = null;
  };

  function leave(name) {
    stopRest();
    releaseAwake();
    navigate(name);
  }

  function finishNow() {
    stopRest();
    const summary = actions.finish();
    releaseAwake();
    navigate(summary ? 'summary' : 'home');
  }

  // ---- sheets ----

  function confirmSheet({ title, message, confirmLabel, danger = false, onConfirm }) {
    const sheet = openSheet({ title });
    const yes = h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button' }, confirmLabel);
    const no = h('button', { class: 'btn btn-ghost', type: 'button' }, 'חזרה');
    yes.addEventListener('click', () => { sheet.close(); onConfirm(); });
    no.addEventListener('click', sheet.close);
    sheet.body.append(h('p', { class: 'sheet-text' }, message), h('div', { class: 'sheet-actions' }, yes, no));
  }

  function openMenu() {
    const sheet = openSheet({ title: 'אפשרויות אימון' });
    const remaining = plan.reduce((s, p) => s + p.sets, 0) - workout.sets.length;
    const option = (label, desc, handler, cls = 'btn-ghost') => {
      const b = h('button', { class: `btn ${cls} menu-option`, type: 'button' }, h('span', null, label), h('span', { class: 'small muted' }, desc));
      b.addEventListener('click', () => { sheet.close(); handler(); });
      return b;
    };
    sheet.body.append(h('div', { class: 'sheet-actions' },
      option('יציאה', 'האימון נשמר ואפשר להמשיך ממנו מהמסך הראשי', () => leave('home')),
      option('סיים אימון עכשיו', workout.sets.length ? 'הסטים שבוצעו יישמרו' : 'עוד לא נרשם אף סט, האימון יימחק', () => {
        if (remaining > 0 && workout.sets.length) {
          confirmSheet({ title: 'לסיים עכשיו?', message: `נותרו ${remaining} סטים. התרגילים שלא הושלמו יסומנו כחלקיים.`, confirmLabel: 'סיים אימון', onConfirm: finishNow });
        } else finishNow();
      }),
      option('בטל אימון', 'האימון וכל הסטים שלו יימחקו', () => confirmSheet({
        title: 'לבטל את האימון?', message: 'כל הסטים שנרשמו באימון הזה יימחקו ולא ניתן לשחזר אותם.',
        confirmLabel: 'בטל אימון', danger: true, onConfirm: () => { stopRest(); actions.discard(); leave('home'); }
      }), 'btn-ghost btn-danger-text')));
  }

  function openLogSheet(pos) {
    const item = plan[pos.exerciseIndex];
    const exercise = exerciseById(item.exerciseId);
    const state = states[item.exerciseId];
    const timed = item.durationSec != null;
    const lastReps = state && Array.isArray(state.lastReps) ? state.lastReps : [];
    const startWeight = state && typeof state.workingWeightKg === 'number' ? state.workingWeightKg : 0;
    const startReps = timed
      ? (lastReps[pos.setIndex] ?? lastReps[lastReps.length - 1] ?? item.durationSec)
      : (lastReps[pos.setIndex] ?? lastReps[lastReps.length - 1] ?? item.repsMin);

    const sheet = openSheet({ title: `${exercise ? exercise.name : 'תרגיל'} · סט ${pos.setIndex + 1}/${item.sets}` });
    const weight = timed ? null : stepper({ label: 'משקל', value: startWeight, step: WEIGHT_STEP, min: 0, max: 600, unit: 'ק״ג' });
    const reps = timed
      ? stepper({ label: 'זמן', value: startReps, step: 5, min: 0, max: 3600, unit: 'שנ׳' })
      : stepper({ label: 'חזרות', value: startReps, step: 1, min: 0, max: 300, unit: '' });
    const confirm = h('button', { class: 'btn btn-primary', type: 'button' }, 'אישור');
    confirm.addEventListener('click', () => {
      confirm.disabled = true;
      actions.recordSet({
        exerciseIndex: pos.exerciseIndex,
        reps: timed ? 0 : reps.get(),
        weightKg: timed ? 0 : weight.get(),
        durationSec: timed ? reps.get() : undefined,
        targetReps: timed ? undefined : item.repsMax,
        targetWeightKg: timed ? undefined : startWeight
      });
      sheet.close();
      afterSet(pos);
    });
    sheet.body.append(h('div', { class: 'sheet-steppers' }, ...(weight ? [weight.el] : []), reps.el), confirm);
  }

  function afterSet(justDone) {
    if (positionFrom(plan, workout.sets).finished) finishNow();
    else showRest(justDone);
  }

  // ---- exercise view ----

  function showExercise() {
    stopRest();
    const pos = positionFrom(plan, workout.sets);
    if (pos.finished) { finishNow(); return; }
    const item = plan[pos.exerciseIndex];
    const exercise = exerciseById(item.exerciseId);
    const state = states[item.exerciseId];
    const timed = item.durationSec != null;
    const lastReps = state && Array.isArray(state.lastReps) ? state.lastReps : [];

    const menu = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'אפשרויות אימון' }, icon('more', { size: 22 }));
    menu.addEventListener('click', openMenu);
    const planned = plan.reduce((s, p) => s + p.sets, 0);
    const fraction = progressFraction(plan, workout.sets);

    const lastLine = lastReps.length
      ? h('p', { class: 'muted small' }, 'בפעם הקודמת: ',
        h('span', { class: 'num', dir: 'ltr' }, timed ? `${lastReps.join(' · ')} שנ׳` : `${kg(state.workingWeightKg || 0)} × ${lastReps.join(' · ')}`))
      : h('p', { class: 'muted small' }, 'בפעם הראשונה: בחר משקל שמרגיש נכון');

    const done = h('button', { class: 'btn btn-primary', type: 'button' }, 'סיימתי סט');
    done.addEventListener('click', () => { unlockAudio(); openLogSheet(pos); });

    root.replaceChildren(
      h('div', { class: 'ob-top' }, menu,
        h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'התקדמות באימון', 'aria-valuemin': 0, 'aria-valuemax': planned, 'aria-valuenow': workout.sets.length },
          h('span', { style: `width:${fraction * 100}%` })),
        h('span', { class: 'small muted num' }, `${workout.sets.length}/${planned}`)),
      h('header', { class: 'ob-head' },
        h('h1', { class: 'ob-title' }, exercise ? exercise.name : 'תרגיל'),
        h('p', { class: 'muted' }, `${exercise ? MUSCLE_LABELS[exercise.muscle] : ''} · תרגיל ${pos.exerciseIndex + 1} מתוך ${plan.length}`)),
      h('div', { class: 'set-badge num' }, `סט ${pos.setIndex + 1} / ${item.sets}`),
      exerciseMedia(item.exerciseId),
      h('div', { class: 'tiles' },
        h('div', { class: 'tile' }, h('span', { class: 'muted small' }, 'יעד'),
          h('span', { class: 'tile-value num', dir: 'ltr' }, timed ? `${item.durationSec} שנ׳` : `${item.repsMin}-${item.repsMax}`)),
        timed ? null : h('div', { class: 'tile' }, h('span', { class: 'muted small' }, 'משקל'),
          h('span', { class: 'tile-value num', dir: 'ltr' }, state && typeof state.workingWeightKg === 'number' ? `${fmt(state.workingWeightKg)} ק״ג` : '—'))),
      lastLine,
      guideBlock(item.exerciseId),
      h('div', { class: 'ob-actions' }, done, swapButton(pos.exerciseIndex)));
  }

  function guideBlock(exerciseId) {
    const guide = guideFor(exerciseId);
    if (!guide) return null;
    return h('details', { class: 'guide' },
      h('summary', null, h('span', null, 'איך מבצעים'), icon('chevronDown', { size: 20 })),
      h('div', { class: 'guide-body' },
        h('ol', null, ...guide.steps.map((s) => h('li', null, s))),
        h('p', { class: 'guide-tip' }, `שימו לב: ${guide.tip}`)));
  }

  // Only before the first set of an exercise, and only when there is a safe replacement.
  function swapButton(exerciseIndex) {
    if (!actions.alternatives(exerciseIndex).length) return null;
    const btn = h('button', { class: 'btn btn-ghost', type: 'button' }, icon('swap', { size: 20 }), h('span', null, 'החלף תרגיל'));
    btn.addEventListener('click', () => openSwapSheet(exerciseIndex));
    return btn;
  }

  function openSwapSheet(exerciseIndex) {
    const sheet = openSheet({ title: 'החלפת תרגיל' });
    const list = h('div', { class: 'swap-list' });
    for (const alt of actions.alternatives(exerciseIndex)) {
      const where = alt.location.length === 2 ? 'חדר כושר או בית' : alt.location[0] === 'gym' ? 'חדר כושר' : 'בית';
      const row = h('button', { class: 'swap-row', type: 'button' },
        h('span', { class: 'swap-text' }, h('span', { class: 'swap-name' }, alt.name), h('span', { class: 'small muted' }, where)),
        h('span', { class: 'swap-pill' }, icon('swap', { size: 18 }), 'החלף'));
      row.addEventListener('click', () => {
        sheet.close();
        if (actions.swapExercise(exerciseIndex, alt.id)) showExercise();
      });
      list.append(row);
    }
    sheet.body.append(h('p', { class: 'sheet-text' }, 'בחר תרגיל חלופי לאותו שריר, שמתאים למיקום, לרמה ולאזורים הרגישים שלך.'), list);
  }

  // ---- rest view ----

  function showRest(justDone) {
    stopRest();
    let totalMs = DEFAULT_REST_SEC * 1000;
    let endAt = Date.now() + totalMs;
    let alerted = false;

    const ring = createRing({ size: 260, stroke: 14 });
    const clock = h('div', { class: 'rest-clock num', role: 'timer', 'aria-live': 'off' }, formatClock(DEFAULT_REST_SEC));
    const skip = h('button', { class: 'btn btn-ghost', type: 'button' }, 'דלג');
    const minus = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'הפחת 15 שניות' }, `‎−${REST_ADJUST_SEC}`);
    const plus = h('button', { class: 'btn btn-ghost', type: 'button', 'aria-label': 'הוסף 15 שניות' }, `‎+${REST_ADJUST_SEC}`);

    const tick = () => {
      if (!root.isConnected) { stopRest(); return; }
      const left = endAt - Date.now();
      clock.textContent = formatClock(Math.ceil(Math.max(0, left) / 1000));
      ring.set(left <= 0 ? 1 : left / totalMs);
      if (left <= 0 && !alerted) {
        alerted = true;
        root.classList.add('rest-done');
        skip.textContent = 'המשך';
        skip.classList.replace('btn-ghost', 'btn-primary');
        beep();
        vibrate([250, 120, 250]);
      }
    };
    const adjust = (deltaSec) => {
      endAt += deltaSec * 1000;
      totalMs = Math.max(1000, totalMs + deltaSec * 1000);
      if (endAt - Date.now() > 0 && alerted) {
        alerted = false;
        root.classList.remove('rest-done');
        skip.textContent = 'דלג';
        skip.classList.replace('btn-primary', 'btn-ghost');
      }
      tick();
    };
    minus.addEventListener('click', () => adjust(-REST_ADJUST_SEC));
    plus.addEventListener('click', () => adjust(REST_ADJUST_SEC));
    skip.addEventListener('click', showExercise);

    const next = nextUp(plan, justDone);
    const nextItem = next ? plan[next.exerciseIndex] : null;
    const nextExercise = nextItem ? exerciseById(nextItem.exerciseId) : null;
    const doneItem = plan[justDone.exerciseIndex];
    const doneSets = workout.sets.filter((s) => s.exerciseId === doneItem.exerciseId);
    const doneExercise = exerciseById(doneItem.exerciseId);

    root.replaceChildren(
      h('header', { class: 'ob-head center' }, h('h1', { class: 'ob-title' }, 'מנוחה')),
      h('div', { class: 'rest-ring' }, ring.el, clock),
      h('div', { class: 'rest-controls' }, minus, skip, plus),
      nextItem ? h('div', { class: 'card next-card' },
        h('span', { class: 'muted small' }, 'הבא בתור'),
        h('span', { class: 'next-name' }, nextExercise ? nextExercise.name : 'תרגיל'),
        h('span', { class: 'muted small num' }, `${next.newExercise ? 'תרגיל חדש · ' : ''}סט ${next.setIndex + 1} / ${nextItem.sets}`)) : null,
      h('div', { class: 'card done-card' },
        h('span', { class: 'muted small' }, `הושלמו · ${doneExercise ? doneExercise.name : ''}`),
        h('ul', { class: 'done-list' }, ...doneSets.map((s, i) =>
          h('li', { class: 'num' }, h('span', null, `סט ${i + 1}`),
            h('span', { dir: 'ltr' }, s.durationSec != null ? `${s.durationSec} שנ׳` : `${kg(s.weightKg)} × ${s.reps}`))))));

    restTimer = setInterval(tick, 250);
    tick();
  }

  showExercise();
  return root;
}
