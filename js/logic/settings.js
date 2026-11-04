// User settings: defaults, sanitising what is stored, and building profile updates. Pure.
import { GOALS, LEVELS, INJURY_AREAS, SEXES, inRange } from './onboarding.js';

export const REST = { min: 30, max: 300, step: 15 }; // inside firestore.rules (10-600)
export const GEAR = ['dumbbells', 'pullupBar', 'kettlebell', 'bands', 'step'];
export const STYLES = ['regular', 'calisthenics', 'military'];

export const DEFAULT_SETTINGS = Object.freeze({
  restSec: 90, homeGear: [], homeStyle: 'regular', superset: false, dropset: false, warmup: true
});

/** The settings to use for a profile: stored values where valid, defaults elsewhere. */
export function settingsOf(profile) {
  const s = (profile && profile.settings) || {};
  const rest = Number.isFinite(s.restSec) ? Math.min(REST.max, Math.max(REST.min, Math.round(s.restSec))) : DEFAULT_SETTINGS.restSec;
  return {
    restSec: rest,
    homeGear: Array.isArray(s.homeGear) ? GEAR.filter((g) => s.homeGear.includes(g)) : [],
    homeStyle: STYLES.includes(s.homeStyle) ? s.homeStyle : DEFAULT_SETTINGS.homeStyle,
    superset: s.superset === true,
    dropset: s.dropset === true,
    warmup: s.warmup !== false
  };
}

/** Field errors for the personal details form. An empty object means it can be saved. */
export function detailErrors(d) {
  const errors = {};
  if (!SEXES.includes(d.sex)) errors.sex = true;
  if (!Number.isInteger(d.age) || !inRange('age', d.age)) errors.age = true;
  if (!inRange('heightCm', d.heightCm)) errors.heightCm = true;
  if (!inRange('weightKg', d.weightKg)) errors.weightKg = true;
  if (!GOALS.includes(d.goal)) errors.goal = true;
  if (!LEVELS.includes(d.level)) errors.level = true;
  if (!Number.isInteger(d.daysPerWeek) || d.daysPerWeek < 2 || d.daysPerWeek > 6) errors.daysPerWeek = true;
  if (!Array.isArray(d.injuries) || !d.injuries.every((i) => INJURY_AREAS.includes(i))) errors.injuries = true;
  const name = typeof d.name === 'string' ? d.name.trim() : '';
  if (name.length > 60) errors.name = true;
  return errors;
}

/** Profile fields to write for the details form. */
export function detailsPatch(d) {
  return {
    name: d.name.trim(),
    sex: d.sex,
    age: d.age,
    heightCm: Math.round(d.heightCm),
    weightKg: Math.round(d.weightKg * 10) / 10,
    goal: d.goal,
    level: d.level,
    daysPerWeek: d.daysPerWeek,
    injuries: [...d.injuries]
  };
}

/**
 * Applies an update the way Firestore's updateDoc does: a key like "settings.restSec" sets one nested field.
 * Used to show a change on screen before the server confirms it.
 */
export function applyPatch(profile, patch) {
  const next = { ...profile };
  for (const [key, value] of Object.entries(patch)) {
    const dot = key.indexOf('.');
    if (dot === -1) next[key] = value;
    else {
      const head = key.slice(0, dot);
      next[head] = { ...(next[head] || {}), [key.slice(dot + 1)]: value };
    }
  }
  return next;
}
