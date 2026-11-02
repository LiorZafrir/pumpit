// "What to train today": the areas a user can pick instead of the planned session, as muscle slots. Pure.
import { SLOTS } from './planner.js';

export const FOCUS_OPTIONS = ['fullBody', 'upper', 'lower', 'chest', 'back', 'shoulders', 'arms', 'abs', 'legs'];

export const FOCUS_LABELS = {
  fullBody: 'גוף מלא', upper: 'פלג עליון', lower: 'פלג תחתון', chest: 'חזה', back: 'גב',
  shoulders: 'כתפיים', arms: 'ידיים', abs: 'בטן', legs: 'רגליים'
};

// Muscle slots per area, in priority order. A muscle repeated means more than one exercise for it.
const FOCUS_SLOTS = {
  fullBody: SLOTS.fullBody,
  upper: SLOTS.upper,
  lower: SLOTS.lower,
  chest: ['chest', 'chest', 'chest', 'chest'],
  back: ['back', 'back', 'rear', 'back'],
  shoulders: ['shoulders', 'rear', 'shoulders', 'shoulders'],
  arms: ['biceps', 'triceps', 'biceps', 'triceps'],
  abs: ['core', 'core', 'core', 'core'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'quads', 'hamstrings']
};

/** Only known areas, each once, in the order of FOCUS_OPTIONS. */
export function normalizeFocus(focus) {
  const wanted = new Set(Array.isArray(focus) ? focus : []);
  return FOCUS_OPTIONS.filter((f) => wanted.has(f));
}

/**
 * The muscle slots for the chosen areas, taking one from each area in turn so that every chosen area gets
 * an exercise before any gets a second. Null when nothing is chosen (use the planned session instead).
 */
export function slotsForFocus(focus) {
  const areas = normalizeFocus(focus);
  if (!areas.length) return null;
  const lists = areas.map((a) => FOCUS_SLOTS[a]);
  const longest = Math.max(...lists.map((l) => l.length));
  const slots = [];
  for (let i = 0; i < longest; i++) for (const list of lists) if (i < list.length) slots.push(list[i]);
  return slots;
}

/** "אימון חזה, גב וכתפיים" */
export function focusTitle(focus) {
  const names = normalizeFocus(focus).map((f) => FOCUS_LABELS[f]);
  if (!names.length) return '';
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} ו${names[names.length - 1]}`;
  return `אימון ${joined}`;
}
