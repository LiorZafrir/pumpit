import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { GOAL_LABELS, INJURY_LABELS, LEVEL_LABELS, SEX_LABELS } from '../ui/labels.js';
import {
  GOALS, INJURY_AREAS, LEVELS, RANGES, STEP_COUNT, emptyAnswers, inRange, stepIsValid
} from '../logic/onboarding.js';
import { MAX_DAYS, MIN_DAYS, recommendedSplit } from '../logic/split.js';

const TITLES = [
  ['קצת עליך', 'כדי להתאים לך את התוכנית'],
  ['גובה ומשקל', 'נשתמש בזה כדי לעקוב אחרי ההתקדמות'],
  ['מה המטרה?', 'אפשר לשנות בהמשך'],
  ['מה הניסיון שלך?', 'כך נקבע את העומס ההתחלתי'],
  ['כמה ימים בשבוע?', 'לפי זה נבנה את חלוקת האימונים'],
  ['יש אזורים רגישים?', 'נמנע מתרגילים שמעמיסים עליהם. אפשר לדלג.']
];

const SPLIT_LABELS = { fullBody: 'גוף מלא', upperLower: 'עליון / תחתון', pushPullLegs: 'דחיפה / משיכה / רגליים' };
const SESSION_LABELS = { fullBody: 'גוף מלא', upper: 'עליון', lower: 'תחתון', push: 'דחיפה', pull: 'משיכה', legs: 'רגליים' };
const FIELD_LABELS = { age: 'גיל', heightCm: 'גובה', weightKg: 'משקל' };

/** @param {{ onSubmit: (answers: object) => Promise<void> }} ctx */
export function render({ onSubmit }) {
  const answers = emptyAnswers();
  let step = 0;
  let saving = false;
  let saveError = false;

  const root = h('section', { class: 'screen onboarding' });
  let nextBtn = null;
  let errorSlot = null;

  function radioGroup(label, options, key, { grid = 'choice-grid' } = {}) {
    const buttons = options.map(({ value, title, desc }) => {
      const btn = h('button', {
        class: 'choice', type: 'button', role: 'radio',
        'aria-checked': String(answers[key] === value)
      }, h('span', { class: 'choice-title' }, title), desc ? h('span', { class: 'choice-desc' }, desc) : null);
      btn.addEventListener('click', () => {
        answers[key] = value;
        for (const b of buttons) b.setAttribute('aria-checked', String(b === btn));
        refresh();
      });
      return btn;
    });
    return h('div', { class: grid, role: 'radiogroup', 'aria-label': label }, ...buttons);
  }

  function numberField(key, { unit, decimal = false }) {
    const input = h('input', {
      id: `f-${key}`, type: 'number', inputmode: decimal ? 'decimal' : 'numeric',
      min: RANGES[key].min, max: RANGES[key].max, step: decimal ? '0.1' : '1',
      value: answers[key] ?? '', autocomplete: 'off', enterkeyhint: 'next'
    });
    const msg = h('div', { class: 'field-error', role: 'alert' });
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      answers[key] = raw === '' ? null : Number(raw);
      const bad = answers[key] !== null && !inRange(key, answers[key]);
      msg.replaceChildren(...(bad
        ? [icon('alert', { size: 18 }), h('span', null, `${FIELD_LABELS[key]} צריך להיות בין ${RANGES[key].min} ל-${RANGES[key].max}`)]
        : []));
      refresh();
    });
    return h('div', { class: 'field' },
      h('label', { for: `f-${key}` }, FIELD_LABELS[key]),
      h('div', { class: 'input-wrap' }, input, h('span', { class: 'unit' }, unit)),
      msg);
  }

  function stepBody() {
    switch (step) {
      case 0:
        return [
          radioGroup('מין', Object.entries(SEX_LABELS).map(([value, title]) => ({ value, title })), 'sex', { grid: 'choice-grid two' }),
          numberField('age', { unit: 'שנים' })
        ];
      case 1:
        return [numberField('heightCm', { unit: 'ס״מ' }), numberField('weightKg', { unit: 'ק״ג', decimal: true })];
      case 2:
        return [radioGroup('מטרה', GOALS.map((value) => ({ value, title: GOAL_LABELS[value][0], desc: GOAL_LABELS[value][1] })), 'goal')];
      case 3:
        return [radioGroup('רמת ניסיון', LEVELS.map((value) => ({ value, title: LEVEL_LABELS[value][0], desc: LEVEL_LABELS[value][1] })), 'level')];
      case 4:
        return daysStep();
      default:
        return [injuryChips()];
    }
  }

  function daysStep() {
    const splitCard = h('div', { class: 'card split-card', 'aria-live': 'polite' });
    const drawSplit = () => {
      const s = recommendedSplit(answers.daysPerWeek);
      splitCard.replaceChildren(
        h('div', { class: 'muted small' }, 'החלוקה המומלצת'),
        h('div', { class: 'split-name' }, SPLIT_LABELS[s.type]),
        h('div', { class: 'split-sessions' }, ...s.sessions.map((x, i) =>
          h('span', { class: 'session-pill' }, h('span', { class: 'num' }, String(i + 1)), SESSION_LABELS[x])))
      );
    };
    const days = [];
    for (let d = MIN_DAYS; d <= MAX_DAYS; d++) days.push(d);
    const pills = days.map((d) => {
      const btn = h('button', {
        class: 'day-pill num', type: 'button', role: 'radio',
        'aria-checked': String(answers.daysPerWeek === d), 'aria-label': `${d} ימים`
      }, String(d));
      btn.addEventListener('click', () => {
        answers.daysPerWeek = d;
        for (const b of pills) b.setAttribute('aria-checked', String(b === btn));
        drawSplit();
      });
      return btn;
    });
    drawSplit();
    return [h('div', { class: 'day-pills', role: 'radiogroup', 'aria-label': 'ימים בשבוע' }, ...pills), splitCard];
  }

  function injuryChips() {
    return h('div', { class: 'chips', role: 'group', 'aria-label': 'אזורים רגישים' }, ...INJURY_AREAS.map((area) => {
      const btn = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(answers.injuries.includes(area)) }, INJURY_LABELS[area]);
      btn.addEventListener('click', () => {
        const i = answers.injuries.indexOf(area);
        if (i >= 0) answers.injuries.splice(i, 1);
        else answers.injuries.push(area);
        btn.setAttribute('aria-pressed', String(i < 0));
      });
      return btn;
    }));
  }

  function refresh() {
    if (nextBtn) nextBtn.disabled = saving || !stepIsValid(step, answers);
  }

  async function submit() {
    if (saving) return;
    saving = true;
    saveError = false;
    draw();
    try {
      await onSubmit(answers);
    } catch {
      saving = false;
      saveError = true;
      draw();
    }
  }

  function goBack() {
    if (step > 0 && !saving) { step -= 1; draw(); }
  }

  function goNext() {
    if (!stepIsValid(step, answers)) return;
    if (step < STEP_COUNT - 1) { step += 1; draw(); } else submit();
  }

  function draw() {
    const last = step === STEP_COUNT - 1;
    const back = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'חזרה', disabled: step === 0 || saving }, icon('arrowRight', { size: 22 }));
    back.addEventListener('click', goBack);
    if (step === 0) back.style.visibility = 'hidden';

    const top = h('div', { class: 'ob-top' }, back,
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'התקדמות בשאלון', 'aria-valuemin': 1, 'aria-valuemax': STEP_COUNT, 'aria-valuenow': step + 1 },
        h('span', { style: `width:${((step + 1) / STEP_COUNT) * 100}%` })),
      h('span', { class: 'small muted num' }, `${step + 1}/${STEP_COUNT}`));

    nextBtn = h('button', { class: 'btn btn-primary', type: 'button' }, saving ? 'שומר…' : last ? 'סיום' : 'המשך');
    nextBtn.addEventListener('click', goNext);

    errorSlot = h('div', { role: 'alert' }, ...(saveError
      ? [h('div', { class: 'error-msg' }, icon('alert', { size: 20 }), h('span', null, 'השמירה נכשלה. בדוק את החיבור ונסה שוב.'))]
      : []));

    const actions = h('div', { class: 'ob-actions' }, errorSlot, nextBtn);
    if (last) {
      const skip = h('button', { class: 'btn btn-text', type: 'button', disabled: saving }, 'דלג');
      skip.addEventListener('click', () => { answers.injuries = []; submit(); });
      actions.append(skip);
    }

    root.replaceChildren(
      top,
      h('header', { class: 'ob-head' }, h('h1', { class: 'ob-title' }, TITLES[step][0]), h('p', { class: 'muted' }, TITLES[step][1])),
      h('div', { class: 'ob-body step-in' }, ...stepBody()),
      actions
    );
    refresh();
  }

  draw();
  return root;
}
