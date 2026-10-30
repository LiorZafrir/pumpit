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
const HOLD_SECONDS = { beg: 30, mid: 40, adv: 60 };

/** Which session comes next, given how many workouts were completed so far. */
export function nextSession(split, completedCount = 0) {
  const n = split.sessions.length;
  const index = ((completedCount % n) + n) % n;
  const type = split.sessions[index];
  const variant = split.sessions.slice(0, index).filter((t) => t === type).length;
  return { index, type, variant };
}

/**
 * @param {object} p
 * @param {string} p.sessionType key of SLOTS
 * @param {'gym'|'home'} p.location
 * @param {string} p.goal tone | loss | mass | fit
 * @param {string} p.level beg | mid | adv
 * @param {string[]} [p.injuries] areas to avoid
 * @param {number} [p.variant] 0 for the first session of a type in the cycle, 1 for the second...
 * @param {object[]} [catalog]
 */
export function planWorkout({ sessionType, location, goal, level, injuries = [], variant = 0 }, catalog = LOCAL_EXERCISES) {
  const slots = SLOTS[sessionType];
  if (!slots) throw new RangeError(`unknown session type: ${sessionType}`);
  const scheme = SCHEMES[goal] || SCHEMES.fit;
  const rank = LEVEL_RANK[level] ?? 0;
  const limit = EXERCISES_BY_LEVEL[level] ?? EXERCISES_BY_LEVEL.beg;

  const pool = catalog.filter((e) =>
    e.location.includes(location)
    && LEVEL_RANK[e.level] <= rank
    && !e.loads.some((area) => injuries.includes(area)));

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

function prescribe(exercise, scheme, level) {
  const base = { exerciseId: exercise.id, name: exercise.name, muscle: exercise.muscle };
  if (exercise.timed) return { ...base, sets: 3, durationSec: HOLD_SECONDS[level] ?? HOLD_SECONDS.beg };
  const sets = level === 'beg' ? Math.min(scheme.sets, 3) : scheme.sets;
  return { ...base, sets, repsMin: scheme.repsMin, repsMax: scheme.repsMax };
}
