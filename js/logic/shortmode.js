// Supersets and the "I have no time" mode: pairing exercises, estimating duration, trimming a plan to fit. Pure.
//
// A plan item with `pair: true` is done as a superset with the item right after it: one set of each, back to back,
// then a single rest. Plan items here need `muscle` (planWorkout gives it) and `sets`.

export const SHORT_OPTIONS = [20, 30, 45];
export const LONG_OPTIONS = [75, 90]; // minutes, for a long workout
export const MAX_EXERCISES = 12; // firestore.rules allows 12 plan items
export const MAX_SETS = 5;
export const SET_SEC = 45; // one set including getting into position
export const TRANSITION_SEC = 60; // moving to a new station or pair
const MIN_REST_SEC = 30;
const SHORT_REST_FACTOR = 0.6;

const ANTAGONISTS = [['chest', 'back'], ['biceps', 'triceps'], ['quads', 'hamstrings'], ['shoulders', 'rear']];
const areAntagonists = (a, b) => ANTAGONISTS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

/** Rest between rounds in the shortened workout. */
export function shortRestSec(restSec) {
  return Math.max(MIN_REST_SEC, Math.round((restSec * SHORT_REST_FACTOR) / 5) * 5);
}

/**
 * Pairs exercises into supersets: opposite muscles first (chest with back, biceps with triceps...), otherwise
 * the next exercise for a different muscle. The partner moves to sit right after its pair leader.
 * Returns new items; the input is not changed.
 */
export function pairExercises(items) {
  const used = new Set();
  const out = [];
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const later = [];
    for (let j = i + 1; j < items.length; j++) if (!used.has(j)) later.push(j);
    const partner = later.find((j) => areAntagonists(items[i].muscle, items[j].muscle))
      ?? later.find((j) => items[j].muscle !== items[i].muscle);
    if (partner === undefined) {
      out.push({ ...items[i], pair: undefined });
      continue;
    }
    used.add(partner);
    out.push({ ...items[i], pair: true }, { ...items[partner], pair: undefined });
  }
  return out;
}

/** Rough workout length in seconds. */
export function estimateSeconds(items, restSec) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.pair && items[i + 1]) {
      const other = items[i + 1];
      const rounds = Math.max(item.sets, other.sets);
      total += (item.sets + other.sets) * SET_SEC + Math.max(0, rounds - 1) * restSec + TRANSITION_SEC;
      i++;
    } else {
      total += item.sets * SET_SEC + Math.max(0, item.sets - 1) * restSec + TRANSITION_SEC;
    }
  }
  return total;
}

/**
 * Fits a plan into `minutes` (not counting `reserveSec`, e.g. a warm-up), doing only as much as needed: shorter rests, then supersets (unless `alwaysPair`),
 * then fewer sets (down to 2), then dropping the extra exercises for a muscle that already has one.
 * Every muscle of the day stays. If nothing fits, returns the shortest plan.
 * @returns {{ exercises: object[], restSec: number, estimateSec: number }}
 */
export function shortenPlan(exercises, minutes, restSec, { alwaysPair = false, reserveSec = 0 } = {}) {
  const rest = shortRestSec(restSec);
  const target = minutes * 60 - reserveSec;
  const result = (items, pair = true) => {
    const exercisesOut = pair ? pairExercises(items) : items;
    return { exercises: exercisesOut, restSec: rest, estimateSec: estimateSeconds(exercisesOut, rest) };
  };

  let items = exercises.map((e) => ({ ...e, pair: undefined }));
  if (!alwaysPair) {
    const plain = result(items, false);
    if (plain.estimateSec <= target) return plain;
  }
  let best = result(items);
  if (best.estimateSec <= target) return best;

  for (const cap of [3, 2]) {
    items = items.map((e) => ({ ...e, sets: Math.min(e.sets, cap) }));
    best = result(items);
    if (best.estimateSec <= target) return best;
  }

  for (;;) {
    let drop = -1;
    for (let i = items.length - 1; i > 0; i--) {
      if (items.slice(0, i).some((e) => e.muscle === items[i].muscle)) { drop = i; break; }
    }
    if (drop === -1) return best;
    items = items.filter((_, i) => i !== drop);
    best = result(items);
    if (best.estimateSec <= target) return best;
  }
}

/**
 * Fills a long workout (more than an hour) by adding exercises, not sets: the `extras` (more exercises for the same muscles, best first)
 * are added while they still fit, up to MAX_EXERCISES. Normal rests. With supersets on, an added exercise that would be left unpaired is not kept.
 * @returns {{ exercises: object[], restSec: number, estimateSec: number }}
 */
export function growPlan(base, extras, minutes, restSec, { alwaysPair = false, reserveSec = 0 } = {}) {
  const target = minutes * 60 - reserveSec;
  const shaped = (items) => (alwaysPair ? pairExercises(items) : items);
  const fits = (items) => estimateSeconds(shaped(items), restSec) <= target;

  let items = base.map((e) => ({ ...e, pair: undefined }));
  for (const extra of extras) {
    if (items.length >= MAX_EXERCISES) break;
    const next = [...items, { ...extra, pair: undefined }];
    if (!fits(next)) break;
    items = next;
  }
  // An odd count leaves one exercise out of the supersets: drop the last one added.
  if (alwaysPair && items.length % 2 === 1 && items.length > base.length) items = items.slice(0, -1);

  const exercises = shaped(items);
  return { exercises, restSec, estimateSec: estimateSeconds(exercises, restSec) };
}
