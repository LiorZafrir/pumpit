// Settings and profile: theme, rest time, home gear and style, advanced techniques, personal details, account.
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { openSheet } from '../ui/sheet.js';
import { applyTheme, THEMES } from '../ui/theme.js';
import { GOAL_LABELS, INJURY_LABELS, LEVEL_LABELS, SEX_LABELS } from '../ui/labels.js';
import { formatClock } from '../ui/labels.js';
import { describeAuthError, signOutUser } from '../auth.js';
import { GOALS, INJURY_AREAS, LEVELS, RANGES } from '../logic/onboarding.js';
import { GEAR, REST, STYLES, detailErrors, detailsPatch, settingsOf } from '../logic/settings.js';

const THEME_LABELS = { lime: 'ירוק ליים', blue: 'כחול', pink: 'ורוד', orange: 'כתום', red: 'אדום', yellow: 'צהוב', purple: 'סגול' };
const GEAR_LABELS = { dumbbells: 'משקולות יד', pullupBar: 'מוט מתח' };
const STYLE_LABELS = {
  regular: ['רגיל', 'כל הציוד שסימנת'],
  calisthenics: ['קליסטניקס', 'משקל גוף ומוט מתח, בלי משקולות'],
  military: ['צבאי', 'שכיבות סמיכה, סקוואטים, מכרעים ומתח קודם']
};
const FIELD_NAMES = { name: 'שם', sex: 'מין', age: 'גיל', heightCm: 'גובה', weightKg: 'משקל', goal: 'מטרה', level: 'רמה', daysPerWeek: 'ימים בשבוע', injuries: 'אזורים רגישים' };
const SAVE_DELAY_MS = 600;

const errorLine = (text) => h('div', { class: 'error-msg', role: 'alert' }, icon('alert', { size: 20 }), h('span', null, text));

function section(title, ...children) {
  return h('section', { class: 'card settings-card' }, h('h2', { class: 'progress-title' }, title), ...children);
}

function switchRow(label, desc, checked, onChange) {
  const sw = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-checked': String(checked), 'aria-label': label });
  sw.addEventListener('click', () => {
    const next = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  return h('div', { class: 'row setting-row' },
    h('span', { class: 'setting-text' }, h('span', null, label), desc ? h('span', { class: 'small muted' }, desc) : null), sw);
}

function numberField(label, unit, value, { step = '1', min, max, mode = 'numeric' } = {}) {
  const input = h('input', { type: 'number', inputmode: mode, step, min, max, value: value ?? '', 'aria-label': label, enterkeyhint: 'done' });
  return { input, el: h('label', { class: 'field' }, h('span', { class: 'muted small' }, label), h('span', { class: 'weigh-input' }, input, h('span', { class: 'unit' }, unit))) };
}

/**
 * @param {{ user: object, profile: object, actions: { updateProfile: Function, deleteAccount: Function } }} ctx
 */
export function render({ user, profile, actions }) {
  const settings = settingsOf(profile);
  let saveTimer = null;
  let pendingPatch = {};

  // Changes show at once and are written after a short pause, so tapping + five times is one write.
  function save(patch) {
    pendingPatch = { ...pendingPatch, ...patch };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, SAVE_DELAY_MS);
  }
  function flush() {
    clearTimeout(saveTimer);
    if (!Object.keys(pendingPatch).length) return;
    actions.updateProfile(pendingPatch);
    pendingPatch = {};
  }
  window.addEventListener('pagehide', flush);
  window.addEventListener('hashchange', flush, { once: true });

  // ---- theme ----

  let theme = THEMES.includes(profile.theme) ? profile.theme : 'lime';
  const swatches = THEMES.map((name) => {
    const btn = h('button', { class: `swatch swatch-${name}`, type: 'button', role: 'radio', 'aria-checked': String(theme === name), 'aria-label': THEME_LABELS[name] },
      icon('check', { size: 20 }));
    btn.addEventListener('click', () => {
      theme = name;
      applyTheme(name);
      for (const b of swatches) b.setAttribute('aria-checked', String(b === btn));
      save({ theme: name });
    });
    return btn;
  });

  // ---- rest time ----

  let restSec = settings.restSec;
  const restValue = h('span', { class: 'num rest-value', 'aria-live': 'polite' }, formatClock(restSec));
  const restBtn = (glyph, name, delta) => {
    const b = h('button', { class: 'step-btn', type: 'button', 'aria-label': `${name} זמן מנוחה` }, icon(glyph, { size: 26 }));
    b.addEventListener('click', () => {
      restSec = Math.min(REST.max, Math.max(REST.min, restSec + delta));
      restValue.textContent = formatClock(restSec);
      save({ 'settings.restSec': restSec });
    });
    return b;
  };

  // ---- home gear and style ----

  let gear = [...settings.homeGear];
  const gearRows = GEAR.map((g) => switchRow(GEAR_LABELS[g], null, gear.includes(g), (on) => {
    gear = on ? [...gear, g] : gear.filter((x) => x !== g);
    save({ 'settings.homeGear': gear });
  }));

  let style = settings.homeStyle;
  const styleButtons = STYLES.map((value) => {
    const [title, desc] = STYLE_LABELS[value];
    const btn = h('button', { class: 'choice', type: 'button', role: 'radio', 'aria-checked': String(style === value) },
      h('span', { class: 'choice-title' }, title), h('span', { class: 'choice-desc' }, desc));
    btn.addEventListener('click', () => {
      style = value;
      for (const b of styleButtons) b.setAttribute('aria-checked', String(b === btn));
      save({ 'settings.homeStyle': value });
    });
    return btn;
  });

  // ---- personal details ----

  const draft = {
    name: profile.name || user.displayName || '', sex: profile.sex, age: profile.age, heightCm: profile.heightCm, weightKg: profile.weightKg,
    goal: profile.goal, level: profile.level, daysPerWeek: profile.daysPerWeek, injuries: [...(profile.injuries || [])]
  };
  const nameInput = h('input', { type: 'text', value: draft.name, maxlength: '60', 'aria-label': 'שם', autocomplete: 'name', enterkeyhint: 'done' });
  const age = numberField('גיל', 'שנים', draft.age, { min: RANGES.age.min, max: RANGES.age.max });
  const height = numberField('גובה', 'ס״מ', draft.heightCm, { min: RANGES.heightCm.min, max: RANGES.heightCm.max });
  const weight = numberField('משקל', 'ק״ג', draft.weightKg, { step: '0.1', mode: 'decimal', min: RANGES.weightKg.min, max: RANGES.weightKg.max });

  const sexButtons = Object.entries(SEX_LABELS).map(([value, label]) => {
    const btn = h('button', { class: 'seg', type: 'button', role: 'radio', 'aria-checked': String(draft.sex === value) }, label);
    btn.addEventListener('click', () => { draft.sex = value; for (const b of sexButtons) b.setAttribute('aria-checked', String(b === btn)); });
    return btn;
  });

  const select = (label, options, key, parse = (v) => v) => {
    const el = h('select', { class: 'select', 'aria-label': label },
      ...options.map(([value, text]) => h('option', { value, selected: String(draft[key]) === String(value) }, text)));
    el.addEventListener('change', () => { draft[key] = parse(el.value); });
    return h('label', { class: 'field' }, h('span', { class: 'muted small' }, label), el);
  };

  const chips = INJURY_AREAS.map((area) => {
    const btn = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(draft.injuries.includes(area)) }, INJURY_LABELS[area]);
    btn.addEventListener('click', () => {
      draft.injuries = draft.injuries.includes(area) ? draft.injuries.filter((a) => a !== area) : [...draft.injuries, area];
      btn.setAttribute('aria-pressed', String(draft.injuries.includes(area)));
    });
    return btn;
  });

  const detailMsg = h('div', null);
  const saveDetails = h('button', { class: 'btn btn-primary', type: 'button' }, 'שמור פרטים');
  saveDetails.addEventListener('click', () => {
    const next = {
      ...draft, name: nameInput.value, age: Number(age.input.value), heightCm: Number(height.input.value), weightKg: Number(weight.input.value)
    };
    if (age.input.value === '' || height.input.value === '' || weight.input.value === '') {
      detailMsg.replaceChildren(errorLine('יש למלא גיל, גובה ומשקל.'));
      return;
    }
    const errors = detailErrors(next);
    const bad = Object.keys(errors);
    if (bad.length) {
      detailMsg.replaceChildren(errorLine(`יש לתקן: ${bad.map((k) => FIELD_NAMES[k]).join(', ')}. הטווחים: גיל ${RANGES.age.min}-${RANGES.age.max}, גובה ${RANGES.heightCm.min}-${RANGES.heightCm.max}, משקל ${RANGES.weightKg.min}-${RANGES.weightKg.max}.`));
      return;
    }
    flush();
    actions.updateProfile(detailsPatch(next));
    detailMsg.replaceChildren(h('div', { class: 'ok-msg', role: 'status' }, icon('check', { size: 20 }), h('span', null, 'הפרטים נשמרו.')));
  });

  // ---- account ----

  const signOutBtn = h('button', { class: 'btn btn-ghost', type: 'button' }, icon('logout', { size: 20 }), 'התנתקות');
  signOutBtn.addEventListener('click', () => { flush(); signOutUser(); });

  const deleteBtn = h('button', { class: 'btn btn-ghost btn-danger-text', type: 'button' }, 'מחיקת חשבון');
  deleteBtn.addEventListener('click', () => {
    const sheet = openSheet({ title: 'למחוק את החשבון?' });
    const msg = h('div', null);
    const yes = h('button', { class: 'btn btn-danger', type: 'button' }, 'מחק הכול');
    const no = h('button', { class: 'btn btn-ghost', type: 'button' }, 'חזרה');
    no.addEventListener('click', sheet.close);
    yes.addEventListener('click', async () => {
      yes.disabled = true;
      no.disabled = true;
      msg.replaceChildren();
      try {
        const status = await actions.deleteAccount();
        if (status === 'redirect') msg.replaceChildren(h('p', { class: 'muted small' }, 'עובר לאישור מול Google...'));
        // On 'done' the sign-in is gone and the app returns to the login screen by itself.
      } catch (err) {
        yes.disabled = false;
        no.disabled = false;
        const text = err && err.code && err.code.startsWith('auth/') ? describeAuthError(err) : 'המחיקה לא הושלמה. בדוק את החיבור ונסה שוב. אם חלק מהנתונים נמחק, אפשר לנסות שוב.';
        msg.replaceChildren(errorLine(text));
      }
    });
    sheet.body.append(
      h('p', { class: 'sheet-text' }, 'כל האימונים, הסטים, המשקל והפרופיל יימחקו לצמיתות, והחשבון ייסגר. לא ניתן לשחזר. Google יבקש ממך לאשר את ההתחברות לפני המחיקה.'),
      msg, h('div', { class: 'sheet-actions' }, yes, no));
  });

  return h('section', { class: 'screen' },
    h('header', { class: 'screen-head' }, h('h1', { class: 'screen-title' }, 'פרופיל')),
    h('div', { class: 'card stack' },
      h('div', { class: 'row' }, h('span', { class: 'muted' }, 'שם'), h('span', null, user.displayName || '')),
      h('div', { class: 'row' }, h('span', { class: 'muted' }, 'אימייל'), h('span', { dir: 'ltr' }, user.email || ''))),

    section('ערכת נושא',
      h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'ערכת נושא' }, ...swatches),
      h('p', { class: 'muted small' }, 'הצבע משתנה מיד, כך שאפשר לראות איך זה נראה.')),

    section('אימון',
      switchRow('חימום לפני האימון', 'כמה דקות של חימום מותאם לשרירים של היום', settings.warmup, (on) => save({ 'settings.warmup': on })),
      h('div', { class: 'row setting-row' },
        h('span', { class: 'setting-text' }, h('span', null, 'זמן מנוחה בין סטים'), h('span', { class: 'small muted' }, 'ברירת מחדל לכל האימונים')),
        h('div', { class: 'rest-stepper', dir: 'ltr' }, restBtn('minus', 'הפחת', -REST.step), restValue, restBtn('plus', 'הוסף', REST.step)))),

    section('אימון בבית',
      h('p', { class: 'muted small' }, 'סמן את הציוד שיש לך. בלי ציוד מסומן התוכנית תכלול תרגילי משקל גוף בלבד.'),
      ...gearRows,
      h('div', { class: 'choice-grid', role: 'radiogroup', 'aria-label': 'סגנון אימון בבית' }, ...styleButtons)),

    section('טכניקות מתקדמות',
      switchRow('סופר סטים', 'האימון מחולק לזוגות תרגילים, בלי מנוחה ביניהם', settings.superset, (on) => save({ 'settings.superset': on })),
      switchRow('דרופ סטים', 'בחלון רישום הסט מופיע "הוסף דרופ" להורדת משקל באותו סט', settings.dropset, (on) => save({ 'settings.dropset': on })),
      h('p', { class: 'muted small' }, 'בכרטיס "האימון של היום" אפשר גם לבחור 20, 30 או 45 דקות. אז האימון מתקצר ומחולק לסופר סטים אוטומטית.')),

    section('פרטים אישיים',
      h('label', { class: 'field' }, h('span', { class: 'muted small' }, 'שם'), h('span', { class: 'weigh-input' }, nameInput)),
      h('div', { class: 'field' }, h('span', { class: 'muted small' }, 'מין'), h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'מין' }, ...sexButtons)),
      h('div', { class: 'field-grid' }, age.el, height.el, weight.el),
      select('מטרה', GOALS.map((g) => [g, GOAL_LABELS[g][0]]), 'goal'),
      select('רמת ניסיון', LEVELS.map((l) => [l, LEVEL_LABELS[l][0]]), 'level'),
      select('ימים בשבוע', [2, 3, 4, 5, 6].map((n) => [n, String(n)]), 'daysPerWeek', Number),
      h('div', { class: 'field' }, h('span', { class: 'muted small' }, 'אזורים רגישים'), h('div', { class: 'chips', role: 'group', 'aria-label': 'אזורים רגישים' }, ...chips)),
      detailMsg, saveDetails),

    signOutBtn,
    section('מחיקת חשבון', h('p', { class: 'muted small' }, 'מוחק את כל הנתונים שלך ואת החשבון.'), deleteBtn));
}
