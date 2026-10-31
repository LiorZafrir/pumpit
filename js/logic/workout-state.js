// Workout documents and the "where am I" logic of a running workout. Pure.
import { toDateKey } from './week.js';
import { workoutVolume } from './progression.js';

export const DEFAULT_REST_SEC = 90;

const without = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

export function setDocId(workoutId, exerciseIndex, setIndex) {
  return `${workoutId}_${exerciseIndex}_${setIndex}`;
}

/** A plan item as stored in the workout document (names and muscles come from the catalog, not Firestore). */
export function toStoredPlanItem(p) {
  return without({ exerciseId: p.exerciseId, sets: p.sets, repsMin: p.repsMin, repsMax: p.repsMax, durationSec: p.durationSec });
}

/** The workouts/{id} document to create when a workout starts. Only fields the rules allow. */
export function buildWorkoutDoc({ now, location, title, sessionType, sessionIndex, plan }) {
  return {
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
    status: 'active'
  };
}

/** The sets/{id} document for one logged set. Timed sets store seconds in durationSec and reps 0. */
export function buildSetDoc({ workoutId, planItem, setIndex, reps, weightKg, durationSec, targetReps, targetWeightKg, now }) {
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
    at: now
  });
}

/** Sets logged for each plan exercise, in plan order: number[] */
export function setCounts(plan, sets) {
  return plan.map((p) => sets.filter((s) => s.exerciseId === p.exerciseId).length);
}

/** The next set to do. `finished` is true when every planned set was logged. */
export function positionFrom(plan, sets) {
  const counts = setCounts(plan, sets);
  for (let i = 0; i < plan.length; i++) {
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

/** What follows the given position, for the "next up" card. null after the last set. */
export function nextUp(plan, position) {
  const item = plan[position.exerciseIndex];
  if (!item) return null;
  if (position.setIndex + 1 < item.sets) return { exerciseIndex: position.exerciseIndex, setIndex: position.setIndex + 1, newExercise: false };
  if (position.exerciseIndex + 1 < plan.length) return { exerciseIndex: position.exerciseIndex + 1, setIndex: 0, newExercise: true };
  return null;
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
