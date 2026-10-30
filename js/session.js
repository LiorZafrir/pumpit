// In-memory state for the signed-in user, plus the actions that change it and persist through store.js.
// Screens never import this: app.js hands them plain data and an `actions` object, so they can be tested without Firebase.
import * as store from './store.js';
import { exerciseById } from './data/local-exercises.js';
import { nextSessionAfter, planWorkout } from './logic/planner.js';
import { evaluateExercise } from './logic/progression.js';
import { recommendedSplit } from './logic/split.js';
import { activeWorkout, lastFinished } from './logic/streak.js';
import { buildSetDoc, buildWorkoutDoc, finishPatch, setDocId } from './logic/workout-state.js';
import { SESSION_TITLES } from './ui/labels.js';

export const session = {
  user: null,
  profile: null,
  workouts: [],
  states: {},
  active: null, // { id, doc, sets } while a workout is running
  summary: null // result of the workout that just ended
};

let syncErrorHandler = null;
export function onSyncError(fn) {
  syncErrorHandler = fn;
}

// Writes are not awaited by the UI (they must work offline). A rejection means the server refused it.
function track(promise) {
  promise.catch(() => { if (syncErrorHandler) syncErrorHandler(); });
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 20) : `w${Date.now()}${Math.floor(Math.random() * 1e6)}`);

export function clearSession() {
  Object.assign(session, { user: null, profile: null, workouts: [], states: {}, active: null, summary: null });
}

export async function loadAll(user) {
  const [profile, workouts, states] = await Promise.all([
    store.getProfile(user.uid),
    store.getRecentWorkouts(user.uid),
    store.getExerciseStates(user.uid)
  ]);
  session.user = user;
  session.profile = profile;
  session.workouts = workouts;
  session.states = states;
  session.active = null;
  return profile;
}

export function splitFor(profile) {
  const days = Math.min(6, Math.max(2, Number(profile.daysPerWeek) || 3));
  return recommendedSplit(days);
}

/** The session that comes next and its exercises, for a given location. */
export function planNext(location) {
  const { profile } = session;
  const next = nextSessionAfter(splitFor(profile), lastFinished(session.workouts)?.sessionIndex);
  const plan = planWorkout({
    sessionType: next.type, location, goal: profile.goal, level: profile.level,
    injuries: Array.isArray(profile.injuries) ? profile.injuries : [], variant: next.variant
  });
  return { next, plan };
}

export const actions = {
  setProfile(profile) {
    session.profile = profile;
  },

  async setLocation(location) {
    const previous = session.profile.lastLocation;
    session.profile = { ...session.profile, lastLocation: location };
    try {
      await store.setLastLocation(session.user.uid, location);
    } catch (err) {
      session.profile = { ...session.profile, lastLocation: previous };
      throw err;
    }
  },

  start(location) {
    if (session.active) return session.active;
    const { next, plan } = planNext(location);
    if (!plan.exercises.length) throw new Error('no exercises for this workout');
    const id = newId();
    const doc = buildWorkoutDoc({
      now: Date.now(), location, title: SESSION_TITLES[next.type],
      sessionType: next.type, sessionIndex: next.index, plan: plan.exercises
    });
    session.workouts = [{ id, ...doc }, ...session.workouts];
    session.active = { id, doc: { id, ...doc }, sets: [] };
    track(store.saveWorkout(session.user.uid, id, doc));
    return session.active;
  },

  /** Loads the sets of an unfinished workout so it can continue where it stopped. */
  async resume() {
    if (session.active) return session.active;
    const workout = activeWorkout(session.workouts);
    if (!workout || !Array.isArray(workout.plan) || !workout.plan.length) return null;
    const sets = await store.getWorkoutSets(session.user.uid, workout.id);
    session.active = { id: workout.id, doc: workout, sets };
    return session.active;
  },

  recordSet({ exerciseIndex, reps, weightKg, durationSec, targetReps, targetWeightKg }) {
    const a = session.active;
    const planItem = a.doc.plan[exerciseIndex];
    const setIndex = a.sets.filter((s) => s.exerciseId === planItem.exerciseId).length;
    const data = buildSetDoc({ workoutId: a.id, planItem, setIndex, reps, weightKg, durationSec, targetReps, targetWeightKg, now: Date.now() });
    const id = setDocId(a.id, exerciseIndex, setIndex);
    a.sets.push({ id, ...data });
    track(store.saveSet(session.user.uid, id, data));
    return data;
  },

  /** Ends the workout. Returns the summary, or null if nothing was logged (the workout is then discarded). */
  finish() {
    const a = session.active;
    if (!a) return null;
    if (!a.sets.length) {
      actions.discard();
      return null;
    }
    const now = Date.now();
    const results = a.doc.plan.map((item) => {
      const exercise = exerciseById(item.exerciseId);
      const sets = a.sets.filter((s) => s.exerciseId === item.exerciseId);
      const evaluation = evaluateExercise({
        planItem: item, muscle: exercise ? exercise.muscle : 'chest', sets,
        prev: session.states[item.exerciseId] || null, now
      });
      return { item, name: exercise ? exercise.name : 'תרגיל', ...evaluation };
    });
    const patch = finishPatch(a.doc, a.sets, now);
    const states = Object.fromEntries(results.filter((r) => r.newState).map((r) => [r.item.exerciseId, r.newState]));

    session.states = { ...session.states, ...states };
    session.workouts = session.workouts.map((w) => (w.id === a.id ? { ...w, ...patch } : w));
    session.summary = {
      workoutId: a.id, title: a.doc.title, ...patch, plannedSets: a.doc.plannedSets,
      results, prCount: results.filter((r) => r.outcome === 'pr').length
    };
    session.active = null;
    track(store.commitFinish(session.user.uid, a.id, patch, states));
    return session.summary;
  },

  discard() {
    const a = session.active;
    if (!a) return;
    session.workouts = session.workouts.filter((w) => w.id !== a.id);
    session.active = null;
    track(store.removeWorkout(session.user.uid, a.id, a.sets.map((s) => s.id)));
  }
};
