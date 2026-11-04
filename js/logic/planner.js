// Builds "today's workout". Pure: the exercise catalog is passed in, no DOM, no Firebase.
import { LOCAL_EXERCISES } from '../data/local-exercises.js';

// Muscle slots per session type, in priority order. A slot with no safe exercise is skipped.
export const SLOTS = {
  fullBody: ['quads', 'chest', 'back', 'hamstrings', 'shoulders', 'core'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'chest'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core', 'quads'],
  push: ['chest', 'shoulders', 'chest', 'triceps', 'shoulders', 'triceps'],
  pull: ['back', 'back', 'rear', 'biceps', 'back', 'core'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'core', 'quads']
};

const LEVEL_RANK = { beg: 0, mid: 1, adv: 2 };
const EXERCISES_BY_LEVEL = { beg: 4, mid: 5, adv: 6 };
const SCHEMES = {
  mass: { sets: 4, repsMin: 6, repsMax: 10 },
  tone: { sets: 3, repsMin: 10, repsMax: 12 },
  fit: { sets: 3, repsMin: 8, repsMax: 12 },
  loss: { sets: 3, repsMin: 12, repsMax: 15 }
};
/** How many exercises a workout has by default at this level. */
export function exerciseLimit(level) {
  return EXERCISES_BY_LEVEL[level] ?? EXERCISES_BY_LEVEL.beg;
}

const HOLD_SECONDS = { beg: 30, mid: 40, adv: 60 };

const WEIGHTS = ['dumbbells', 'kettlebell'];

/**
 * Whether an exercise can be done where the user is. At home it needs the gear they own, and the
 * calisthenics and military styles leave out anything that needs external weights.
 */
export function availableAt(exercise, { location, gear = [], style = 'regular' }) {
  if (!exercise.location.includes(location)) return false;
  if (location === 'gym') return true;
  const needs = exercise.gear || [];
  if (style !== 'regular' && needs.some((g) => WEIGHTS.includes(g))) return false;
  return needs.every((g) => gear.includes(g));
}

/** Which session comes next, given how many workouts were completed so far. */
export function nextSession(split, completedCount = 0) {
  const n = split.sessions.length;
  const index = ((completedCount % n) + n) % n;
  const type = split.sessions[index];
  const variant = split.sessions.slice(0, index).filter((t) => t === type).length;
  return { index, type, variant };
}

/** The session after the last finished one (`lastIndex` is its sessionIndex, or null/undefined for none). */
export function nextSessionAfter(split, lastIndex) {
  return nextSession(split, typeof lastIndex === 'number' ? lastIndex + 1 : 0);
}

/**
 * @param {object} p
 * @param {string} p.sessionType key of SLOTS
 * @param {'gym'|'home'} p.location
 * @param {string} p.goal tone | loss | mass | fit
 * @param {string} p.level beg | mid | adv
 * @param {string[]} [p.injuries] areas to avoid
 * @param {number} [p.variant] 0 for the first session of a type in the cycle, 1 for the second...
 * @param {string[]} [p.gear] equipment available at home
 * @param {string} [p.style] home style: regular | calisthenics | military
 * @param {string[]} [p.slots] muscle slots to use instead of the session type's (a chosen focus)
 * @param {number} [p.maxExercises] exercise limit instead of the level's
 * @param {object[]} [catalog]
 */
export function planWorkout({ sessionType, location, goal, level, injuries = [], variant = 0, gear = [], style = 'regular', slots: customSlots = null, maxExercises = null }, catalog = LOCAL_EXERCISES) {
  const slots = customSlots || SLOTS[sessionType];
  if (!slots) throw new RangeError(`unknown session type: ${sessionType}`);
  const scheme = SCHEMES[goal] || SCHEMES.fit;
  const rank = LEVEL_RANK[level] ?? 0;
  const limit = maxExercises ?? EXERCISES_BY_LEVEL[level] ?? EXERCISES_BY_LEVEL.beg;

  const pool = catalog.filter((e) =>
    availableAt(e, { location, gear, style })
    && LEVEL_RANK[e.level] <= rank
    && !e.loads.some((area) => injuries.includes(area)));
  // Military style: its favourite exercises come first within each muscle.
  if (location === 'home' && style === 'military') pool.sort((a, b) => Number(Boolean(b.mil)) - Number(Boolean(a.mil)));

  const used = new Set();
  const exercises = [];
  for (const muscle of slots) {
    if (exercises.length >= limit) break;
    const candidates = pool.filter((e) => e.muscle === muscle && !used.has(e.id));
    if (!candidates.length) continue;
    const pick = candidates[variant % candidates.length];
    used.add(pick.id);
    exercises.push(prescribe(pick, scheme, level));
  }
  return {
    sessionType,
    location,
    exercises,
    plannedSets: exercises.reduce((sum, e) => sum + e.sets, 0)
  };
}

/** Sets, reps or hold time for one exercise, as `planWorkout` would give it for this goal and level. */
export function prescribeExercise(exercise, goal, level) {
  return prescribe(exercise, SCHEMES[goal] || SCHEMES.fit, level);
}

function prescribe(exercise, scheme, level) {
  const base = { exerciseId: exercise.id, name: exercise.name, muscle: exercise.muscle };
  if (exercise.timed) return { ...base, sets: 3, durationSec: HOLD_SECONDS[level] ?? HOLD_SECONDS.beg };
  const sets = level === 'beg' ? Math.min(scheme.sets, 3) : scheme.sets;
  return { ...base, sets, repsMin: scheme.repsMin, repsMax: scheme.repsMax };
}
