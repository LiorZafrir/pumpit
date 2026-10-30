// Progressive overload, personal records and volume. Pure.
//
// Double progression: each exercise has a rep range. When every planned set reached the top of the
// range, the weight goes up next time (2.5 kg upper body, 5 kg lower body) and reps restart at the
// bottom of the range. Otherwise the weight stays and the target is the top of the range.

export const INCREMENT = { upper: 2.5, lower: 5 };
const LOWER_MUSCLES = ['quads', 'hamstrings', 'glutes', 'calves'];
const MAX_WEIGHT = 600;

export function regionOf(muscle) {
  return LOWER_MUSCLES.includes(muscle) ? 'lower' : 'upper';
}

const round1 = (n) => Math.round(n * 10) / 10;

export function setVolume(set) {
  return (set.weightKg || 0) * (set.reps || 0);
}

export function workoutVolume(sets) {
  return round1(sets.reduce((sum, s) => sum + setVolume(s), 0));
}

/**
 * Evaluate one exercise after a workout.
 * @param {object} p
 * @param {{ sets: number, repsMin?: number, repsMax?: number, durationSec?: number }} p.planItem
 * @param {string} p.muscle
 * @param {object[]} p.sets logged sets of this exercise ({ reps, weightKg, durationSec? }), in order
 * @param {object|null} p.prev previous exerciseState, or null the first time
 * @param {number} p.now
 * @returns {{ outcome: 'pr'|'done'|'partial'|'skipped', newState: object|null, next: object|null, setsDone: number }}
 */
export function evaluateExercise({ planItem, muscle, sets, prev, now }) {
  if (!sets.length) return { outcome: 'skipped', newState: null, next: null, setsDone: 0 };

  const timed = planItem.durationSec != null;
  const completedAll = sets.length >= planItem.sets;
  const value = (s) => (timed ? s.durationSec || 0 : s.reps || 0);
  const workingWeight = timed ? 0 : Math.max(...sets.map((s) => s.weightKg || 0));

  // Personal record. The first time we only record a baseline, so nothing is a "record" yet.
  const hasHistory = prev && typeof prev.prWeightKg === 'number';
  let bestW = hasHistory ? prev.prWeightKg : -1;
  let bestR = hasHistory ? prev.prReps || 0 : -1;
  let isPR = false;
  for (const s of sets) {
    const w = timed ? 0 : s.weightKg || 0;
    const r = value(s);
    if (w > bestW || (w === bestW && r > bestR)) {
      bestW = w;
      bestR = r;
      if (hasHistory) isPR = true;
    }
  }

  // Next target.
  let nextWeight = workingWeight;
  let nextReps = timed ? planItem.durationSec : planItem.repsMax;
  let increased = false;
  const hitTop = !timed && completedAll && sets.every((s) => (s.reps || 0) >= planItem.repsMax);
  if (hitTop && workingWeight > 0) {
    nextWeight = Math.min(MAX_WEIGHT, round1(workingWeight + INCREMENT[regionOf(muscle)]));
    nextReps = planItem.repsMin;
    increased = nextWeight > workingWeight;
  }

  const newState = {
    workingWeightKg: nextWeight,
    targetReps: Math.min(300, nextReps),
    lastDoneAt: now,
    prWeightKg: bestW,
    prReps: Math.min(300, bestR),
    lastReps: sets.slice(0, 10).map(value)
  };

  return {
    outcome: isPR ? 'pr' : completedAll ? 'done' : 'partial',
    newState,
    next: { weightKg: nextWeight, targetReps: nextReps, increased, timed, bodyweight: !timed && workingWeight === 0 && hitTop },
    setsDone: sets.length
  };
}
