// Workout documents and the "where am I" logic of a running workout. Pure.
import { toDateKey } from './week.js';
import { workoutVolume } from './progression.js';


const without = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

export function setDocId(workoutId, exerciseIndex, setIndex) {
  return `${workoutId}_${exerciseIndex}_${setIndex}`;
}

/** A plan item as stored in the workout document (names and muscles come from the catalog, not Firestore). */
export function toStoredPlanItem(p) {
  return without({ exerciseId: p.exerciseId, sets: p.sets, repsMin: p.repsMin, repsMax: p.repsMax, durationSec: p.durationSec, pair: p.pair === true ? true : undefined });
}

/** The workouts/{id} document to create when a workout starts. Only fields the rules allow. */
export function buildWorkoutDoc({ now, location, title, sessionType, sessionIndex, plan, shortMin, longMin, focus }) {
  return without({
    date: toDateKey(new Date(now)),
    location,
    title,
    sessionType,
    sessionIndex,
    plan: plan.map(toStoredPlanItem),
    startedAt: now,
    plannedSets: plan.reduce((sum, p) => sum + p.sets, 0),
    completedSets: 0,
    volumeKg: 0,
    status: 'active',
    shortMin,
    longMin,
    focus: Array.isArray(focus) && focus.length ? [...focus] : undefined
  });
}

/** The sets/{id} document for one logged set. Timed sets store seconds in durationSec and reps 0. */
export function buildSetDoc({ workoutId, planItem, setIndex, reps, weightKg, durationSec, targetReps, targetWeightKg, drops, now }) {
  const timed = planItem.durationSec != null;
  return without({
    workoutId,
    exerciseId: planItem.exerciseId,
    setIndex,
    reps: timed ? 0 : Math.max(0, Math.round(reps)),
    weightKg: timed ? 0 : Math.max(0, Math.round(weightKg * 10) / 10),
    durationSec: timed ? Math.max(0, Math.round(durationSec)) : undefined,
    targetReps: targetReps != null ? Math.max(0, Math.round(targetReps)) : undefined,
    targetWeightKg: targetWeightKg != null ? Math.max(0, Math.round(targetWeightKg * 10) / 10) : undefined,
    drops: !timed && Array.isArray(drops) && drops.length ? drops.slice(0, MAX_DROPS).map(cleanDrop) : undefined,
    at: now
  });
}

export const MAX_DROPS = 6;
const cleanDrop = (d) => ({ reps: Math.max(0, Math.round(d.reps)), weightKg: Math.max(0, Math.round(d.weightKg * 10) / 10) });

/** Sets logged for each plan exercise, in plan order: number[] */
export function setCounts(plan, sets) {
  return plan.map((p) => sets.filter((s) => s.exerciseId === p.exerciseId).length);
}

/** Index of the exercise done together with plan[index] as a superset, or -1. */
export function partnerOf(plan, index) {
  if (plan[index]?.pair && plan[index + 1]) return index + 1;
  if (index > 0 && plan[index - 1]?.pair) return index - 1;
  return -1;
}

/**
 * The next set to do. `finished` is true when every planned set was logged.
 * A superset pair alternates: first exercise, second exercise, first, second...
 */
export function positionFrom(plan, sets) {
  const counts = setCounts(plan, sets);
  for (let i = 0; i < plan.length; i++) {
    if (plan[i].pair && plan[i + 1]) {
      const aLeft = counts[i] < plan[i].sets;
      const bLeft = counts[i + 1] < plan[i + 1].sets;
      if (aLeft && (counts[i] <= counts[i + 1] || !bLeft)) return { exerciseIndex: i, setIndex: counts[i], finished: false };
      if (bLeft) return { exerciseIndex: i + 1, setIndex: counts[i + 1], finished: false };
      i++;
      continue;
    }
    if (counts[i] < plan[i].sets) return { exerciseIndex: i, setIndex: counts[i], finished: false };
  }
  return { exerciseIndex: plan.length - 1, setIndex: plan.length ? plan[plan.length - 1].sets : 0, finished: true };
}

export function progressFraction(plan, sets) {
  const planned = plan.reduce((sum, p) => sum + p.sets, 0);
  if (!planned) return 0;
  const done = setCounts(plan, sets).reduce((sum, c, i) => sum + Math.min(c, plan[i].sets), 0);
  return done / planned;
}

/**
 * What comes after a set was logged, for the "next up" card. `justDone` is the exercise index just worked.
 * null after the last set. `newExercise` is false when it is the same exercise again or its superset partner.
 */
export function nextUp(plan, sets, justDone) {
  const next = positionFrom(plan, sets);
  if (next.finished) return null;
  return { exerciseIndex: next.exerciseIndex, setIndex: next.setIndex, newExercise: next.exerciseIndex !== justDone && partnerOf(plan, justDone) !== next.exerciseIndex };
}

/** Fields to merge into the workout document when it ends. */
export function finishPatch(workout, sets, now) {
  return {
    status: 'done',
    endedAt: now,
    durationSec: Math.max(0, Math.round((now - workout.startedAt) / 1000)),
    completedSets: sets.length,
    volumeKg: workoutVolume(sets)
  };
}
