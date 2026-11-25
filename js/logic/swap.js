// Exercise swap: a replacement for the same muscle when a machine is taken or something hurts. Pure.
// Plan items in a workout document hold only the exercise id, so muscles are looked up in the catalog.
import { LOCAL_EXERCISES } from '../data/local-exercises.js';
import { availableAt, prescribeExercise } from './planner.js';
import { toStoredPlanItem } from './workout-state.js';
import { MAX_EXERCISES, pairExercises } from './shortmode.js';

const LEVEL_RANK = { beg: 0, mid: 1, adv: 2 };

/**
 * Exercises that can replace plan item `index`: same muscle, same location, safe for the injuries,
 * not above the user's level and not already in today's workout. Catalog order is kept.
 */
export function alternativesFor(plan, index, { location, level, injuries = [], gear = [], style = 'regular', stretch = false }, catalog = LOCAL_EXERCISES) {
  const item = plan[index];
  const current = item && catalog.find((e) => e.id === item.exerciseId);
  if (!current) return [];
  // With `stretch` the user may also see exercises one level above theirs, as a harder option.
  const rank = (LEVEL_RANK[level] ?? 0) + (stretch ? 1 : 0);
  const inPlan = new Set(plan.map((p) => p.exerciseId));
  return catalog.filter((e) =>
    e.muscle === current.muscle
    && !inPlan.has(e.id)
    && availableAt(e, { location, gear, style })
    && LEVEL_RANK[e.level] <= rank
    && !e.loads.some((area) => injuries.includes(area)));
}

/**
 * The plan with item `index` replaced by `exercise`, prescribed for the user's goal and level. The slot keeps its
 * place in a superset pair and never gets more sets than it had, so a shortened workout stays short.
 */
export function swapPlanItem(plan, index, exercise, { goal, level }) {
  return plan.map((item, i) => {
    if (i !== index) return item;
    const next = toStoredPlanItem(prescribeExercise(exercise, goal, level));
    return toStoredPlanItem({ ...next, sets: Math.min(next.sets, item.sets), pair: item.pair });
  });
}

/** Every exercise the user could add to this plan: available where they are, safe, not above their level, not already in it. */
export function addableExercises(plan, { location, level, injuries = [], gear = [], style = 'regular' }, catalog = LOCAL_EXERCISES) {
  const rank = LEVEL_RANK[level] ?? 0;
  const inPlan = new Set(plan.map((p) => p.exerciseId));
  return catalog.filter((e) =>
    !inPlan.has(e.id)
    && availableAt(e, { location, gear, style })
    && LEVEL_RANK[e.level] <= rank
    && !e.loads.some((area) => injuries.includes(area)));
}

/** The plan without item `index`. */
export function removePlanItem(plan, index) {
  return plan.filter((_, i) => i !== index);
}

/** The plan with `exercise` added at the end, prescribed for the goal and level and never with more sets than the plan already uses. */
export function addPlanItem(plan, exercise, { goal, level }, catalog = LOCAL_EXERCISES) {
  if (plan.length >= MAX_EXERCISES || plan.some((p) => p.exerciseId === exercise.id)) return plan;
  const next = toStoredPlanItem(prescribeExercise(exercise, goal, level));
  const cap = plan.length ? Math.max(...plan.map((p) => p.sets)) : next.sets;
  return [...plan, toStoredPlanItem({ ...next, sets: Math.min(next.sets, cap) })];
}

/**
 * Pairs the plan into supersets again after an edit (or clears the pairs). Plan items hold only ids, so the muscle
 * comes from the catalog.
 */
export function rePair(plan, wantPairs, catalog = LOCAL_EXERCISES) {
  const plain = plan.map((p) => ({ ...p, pair: undefined, muscle: p.muscle ?? catalog.find((e) => e.id === p.exerciseId)?.muscle }));
  const paired = wantPairs ? pairExercises(plain) : plain;
  return paired.map((p) => (p.pair === true ? p : { ...p, pair: undefined }));
}

/** How hard `alt` is next to `current`: 'easier', 'same' or 'harder' (by catalog level). */
export function difficultyOf(current, alt) {
  const d = (LEVEL_RANK[alt.level] ?? 0) - (LEVEL_RANK[current.level] ?? 0);
  return d < 0 ? 'easier' : d > 0 ? 'harder' : 'same';
}

export const DIFFICULTY_LABELS = { easier: 'קל יותר', same: 'אותה רמה', harder: 'מאתגר יותר' };

/** The nearest easier and harder exercise for the same muscle (or null), picked from `alternativesFor` with stretch. */
export function easierHarder(plan, index, ctx, catalog = LOCAL_EXERCISES) {
  const current = catalog.find((e) => e.id === plan[index]?.exerciseId);
  if (!current) return { easier: null, harder: null };
  const alts = alternativesFor(plan, index, { ...ctx, stretch: true }, catalog);
  const rank = (e) => LEVEL_RANK[e.level] ?? 0;
  const easier = alts.filter((e) => rank(e) < rank(current)).sort((a, b) => rank(b) - rank(a))[0] ?? null;
  const harder = alts.filter((e) => rank(e) > rank(current)).sort((a, b) => rank(a) - rank(b))[0] ?? null;
  return { easier, harder };
}
