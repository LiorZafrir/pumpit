// Progress: working weight per exercise, body weight with a trend line, latest records.
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { lineChart } from '../ui/chart.js';
import { formatShortDate } from '../ui/labels.js';
import { exerciseById } from '../data/local-exercises.js';
import {
  BODY_WEIGHT_RANGE, bodyWeightPoints, change, exerciseSeries, exercisesWithData, periodStart, recentRecords, trendLine
} from '../logic/progress.js';

const PERIOD_LABELS = [['month', 'חודש'], ['quarter', '3 חודשים'], ['year', 'שנה']];
const UNITS = { weight: 'ק״ג', time: 'שנ׳', reps: 'חזרות' };
const METRIC_TITLES = { weight: 'משקל עבודה', time: 'זמן החזקה', reps: 'חזרות' };

const round1 = (n) => Math.round(n * 10) / 10;
const fmt = (n) => String(round1(n));
const nameOf = (id) => exerciseById(id)?.name ?? 'תרגיל';
// LRM after a Hebrew unit keeps numbers in reading order inside the left-to-right chart text.
const withUnit = (n, unit) => `${fmt(n)} ${unit}‎`;

function errorLine(text) {
  return h('div', { class: 'error-msg', role: 'alert' }, icon('alert', { size: 20 }), h('span', null, text));
}

function deltaText(delta, unit) {
  if (delta == null) return 'צריך עוד מדידה אחת כדי לראות שינוי';
  if (delta === 0) return 'ללא שינוי בתקופה';
  return `${delta > 0 ? 'עלייה' : 'ירידה'} של ${fmt(Math.abs(delta))} ${unit} בתקופה`;
}

/**
 * @param {{ actions: { progressSets: Function, bodyWeights: Function, logBodyWeight: Function }, profile: object }} ctx
 */
export function render({ actions, profile }) {
  let period = 'month';
  let exerciseId = null;
  let sets = [];
  let bodyEntries = [];
  let loadToken = 0;

  const exerciseSlot = h('div', { class: 'card progress-card' });
  const bodySlot = h('div', { class: 'card progress-card' });
  const recordsSlot = h('div', { class: 'card progress-card' });

  const segButtons = PERIOD_LABELS.map(([value, label]) => {
    const btn = h('button', { class: 'seg', type: 'button', role: 'radio', 'aria-checked': String(period === value) }, label);
    btn.addEventListener('click', () => {
      if (period === value) return;
      period = value;
      for (const b of segButtons) b.setAttribute('aria-checked', String(b === btn));
      load();
    });
    return btn;
  });

  // ---- exercise chart ----

  function drawExercise() {
    const ids = exercisesWithData(sets);
    if (!ids.length) {
      exerciseSlot.replaceChildren(
        h('h2', { class: 'progress-title' }, 'משקל עבודה'),
        h('div', { class: 'empty-inline' }, icon('chart', { size: 32 }), h('p', null, 'עוד אין אימונים בתקופה הזאת. הגרף יופיע אחרי האימון הראשון.')));
      return;
    }
    if (!ids.includes(exerciseId)) exerciseId = ids[0];

    const select = h('select', { class: 'select', 'aria-label': 'בחירת תרגיל' },
      ...ids.map((id) => h('option', { value: id, selected: id === exerciseId }, nameOf(id))));
    select.addEventListener('change', () => { exerciseId = select.value; drawExercise(); });

    const { metric, points } = exerciseSeries(sets.filter((s) => s.exerciseId === exerciseId));
    const unit = UNITS[metric];
    const last = points[points.length - 1];
    exerciseSlot.replaceChildren(
      h('div', { class: 'row' },
        h('h2', { class: 'progress-title' }, METRIC_TITLES[metric]),
        h('span', { class: 'num progress-now', dir: 'ltr' }, withUnit(last.value, unit))),
      select,
      lineChart({
        points, formatY: fmt, formatX: formatShortDate,
        label: `${METRIC_TITLES[metric]} ב${nameOf(exerciseId)}: ${points.length} אימונים, אחרון ${withUnit(last.value, unit)}`
      }),
      h('p', { class: 'muted small' }, `${points.length} אימונים בתקופה. ${deltaText(change(points), unit)}.`));
  }

  // ---- body weight ----

  function drawBody() {
    const points = bodyWeightPoints(bodyEntries, periodStart(period));
    const latest = bodyEntries[0];
    const input = h('input', {
      type: 'number', inputmode: 'decimal', step: '0.1', min: BODY_WEIGHT_RANGE.min, max: BODY_WEIGHT_RANGE.max,
      value: latest ? fmt(latest.kg) : (profile && profile.weightKg ? fmt(profile.weightKg) : ''), 'aria-label': 'משקל גוף בק״ג', enterkeyhint: 'done'
    });
    const msg = h('div', null);
    const save = h('button', { class: 'btn btn-primary btn-compact', type: 'button' }, 'שמור משקל');
    save.addEventListener('click', () => {
      const kg = round1(Number(input.value));
      if (input.value.trim() === '' || !Number.isFinite(kg) || kg < BODY_WEIGHT_RANGE.min || kg > BODY_WEIGHT_RANGE.max) {
        msg.replaceChildren(errorLine(`הכנס משקל בין ${BODY_WEIGHT_RANGE.min} ל-${BODY_WEIGHT_RANGE.max} ק״ג.`));
        return;
      }
      const entry = actions.logBodyWeight(kg);
      bodyEntries = [entry, ...bodyEntries.filter((e) => e.id !== entry.id)];
      drawBody();
    });

    const trend = trendLine(points);
    const delta = change(points);
    bodySlot.replaceChildren(
      h('div', { class: 'row' },
        h('h2', { class: 'progress-title' }, 'משקל גוף'),
        latest ? h('span', { class: 'num progress-now', dir: 'ltr' }, withUnit(latest.kg, 'ק״ג')) : null),
      h('div', { class: 'weigh-in' },
        h('div', { class: 'weigh-input' }, input, h('span', { class: 'unit' }, 'ק״ג')), save),
      msg,
      points.length
        ? lineChart({ points, trend, formatY: fmt, formatX: formatShortDate, label: `משקל גוף: ${points.length} מדידות, אחרונה ${withUnit(points[points.length - 1].value, 'ק״ג')}` })
        : h('p', { class: 'muted small' }, 'שמור משקל כדי להתחיל לעקוב. מספיק פעם בשבוע, באותו שעה ביום.'),
      points.length ? h('p', { class: 'muted small' }, `${deltaText(delta, 'ק״ג')}. הקו המקווקו הוא המגמה.`) : null);
  }

  // ---- records ----

  function drawRecords() {
    const records = recentRecords(sets, periodStart(period));
    recordsSlot.replaceChildren(
      h('h2', { class: 'progress-title' }, 'שיאים אחרונים'),
      records.length
        ? h('ul', { class: 'record-list' }, ...records.map((r) => h('li', { class: 'record-row' },
          h('span', { class: 'record-icon' }, icon('trophy', { size: 20 })),
          h('span', { class: 'record-text' }, h('span', { class: 'record-name' }, nameOf(r.exerciseId)), h('span', { class: 'muted small' }, formatShortDate(r.at))),
          h('span', { class: 'num', dir: 'ltr' },
            r.durationSec != null ? withUnit(r.durationSec, 'שנ׳') : r.weightKg > 0 ? `${withUnit(r.weightKg, 'ק״ג')} × ${r.reps}` : `${r.reps} חזרות‎`))))
        : h('p', { class: 'muted small' }, 'שיא חדש נרשם כשמעלים משקל או חזרות מעל מה שעשית בעבר. עוד אין שיאים בתקופה הזאת.'));
  }

  // ---- loading ----

  async function load() {
    const token = ++loadToken;
    exerciseSlot.setAttribute('aria-busy', 'true');
    try {
      const [loadedSets, loadedBody] = await Promise.all([actions.progressSets(period), actions.bodyWeights()]);
      if (token !== loadToken) return;
      sets = loadedSets;
      bodyEntries = loadedBody;
      exerciseSlot.removeAttribute('aria-busy');
      drawExercise();
      drawBody();
      drawRecords();
    } catch {
      if (token !== loadToken) return;
      const retry = h('button', { class: 'btn btn-ghost btn-compact', type: 'button' }, 'נסה שוב');
      retry.addEventListener('click', load);
      exerciseSlot.replaceChildren(errorLine('לא הצלחנו לטעון את ההתקדמות. בדוק את החיבור ונסה שוב.'), retry);
      bodySlot.replaceChildren();
      recordsSlot.replaceChildren();
    }
  }

  load();

  return h('section', { class: 'screen' },
    h('header', { class: 'screen-head' }, h('h1', { class: 'screen-title' }, 'התקדמות')),
    h('div', { class: 'segmented period-picker', role: 'radiogroup', 'aria-label': 'תקופה' }, ...segButtons),
    exerciseSlot, bodySlot, recordsSlot);
}
