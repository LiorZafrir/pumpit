// Weekly stats from finished workouts. Pure. Weeks run Sunday to Saturday, dates are local date keys (YYYY-MM-DD).
import { toDateKey } from './week.js';

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function weekStartKey(dateKey) {
  const d = parseKey(dateKey);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()));
}

function shiftWeek(weekKey, weeks) {
  const d = parseKey(weekKey);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * weeks));
}

const finished = (workouts) => workouts.filter((w) => w.status === 'done' && typeof w.date === 'string');

export function doneDates(workouts) {
  return new Set(finished(workouts).map((w) => w.date));
}

export function doneThisWeek(workouts, now = new Date()) {
  const week = weekStartKey(toDateKey(now));
  return finished(workouts).filter((w) => weekStartKey(w.date) === week).length;
}

/**
 * Consecutive weeks in which the weekly goal was met. The current week counts once it is met,
 * but an unfinished current week does not break the streak.
 */
export function weeklyStreak(workouts, goalDays, now = new Date()) {
  if (!goalDays || goalDays < 1) return 0;
  const perWeek = new Map();
  for (const w of finished(workouts)) {
    const key = weekStartKey(w.date);
    perWeek.set(key, (perWeek.get(key) || 0) + 1);
  }
  let week = weekStartKey(toDateKey(now));
  let streak = 0;
  if ((perWeek.get(week) || 0) >= goalDays) streak += 1;
  for (let i = 0; i < 520; i++) {
    week = shiftWeek(week, -1);
    if ((perWeek.get(week) || 0) >= goalDays) streak += 1;
    else break;
  }
  return streak;
}

export function lastFinished(workouts) {
  return finished(workouts).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0] || null;
}

export function activeWorkout(workouts) {
  return workouts.filter((w) => w.status === 'active').sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))[0] || null;
}
