// Numbers behind the progress screen: per-exercise series, body-weight trend, recent records. Pure.

const DAY_MS = 86400000;
export const BODY_WEIGHT_RANGE = { min: 25, max: 350 }; // same bounds as firestore.rules
export const PERIODS = { month: 30, quarter: 90, year: 365 };

export function periodStart(period, now = Date.now()) {
  return now - (PERIODS[period] ?? PERIODS.month) * DAY_MS;
}

const isTimed = (s) => s.durationSec != null;

/** What to chart for an exercise: seconds (timed), kg (loaded) or reps (bodyweight). */
export function metricOf(sets) {
  if (sets.some(isTimed)) return 'time';
  return sets.some((s) => (s.weightKg || 0) > 0) ? 'weight' : 'reps';
}

const valueOf = (s, metric) => (metric === 'time' ? s.durationSec || 0 : metric === 'weight' ? s.weightKg || 0 : s.reps || 0);

/**
 * One point per workout: the best value reached in it.
 * @param {object[]} sets logged sets of ONE exercise ({ workoutId, at, reps, weightKg, durationSec? })
 * @returns {{ metric: 'time'|'weight'|'reps', points: { at: number, value: number }[] }}
 */
export function exerciseSeries(sets) {
  const metric = metricOf(sets);
  const byWorkout = new Map();
  for (const s of sets) {
    const value = valueOf(s, metric);
    const cur = byWorkout.get(s.workoutId);
    if (!cur) byWorkout.set(s.workoutId, { at: s.at || 0, value });
    else byWorkout.set(s.workoutId, { at: Math.max(cur.at, s.at || 0), value: Math.max(cur.value, value) });
  }
  return { metric, points: [...byWorkout.values()].sort((a, b) => a.at - b.at) };
}

/** Exercise ids that have sets, most recently trained first. */
export function exercisesWithData(sets) {
  const last = new Map();
  for (const s of sets) last.set(s.exerciseId, Math.max(last.get(s.exerciseId) || 0, s.at || 0));
  return [...last.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** Least-squares line through the points, as its two end points. Null when there is nothing to fit. */
export function trendLine(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.at, 0) / n;
  const my = points.reduce((s, p) => s + p.value, 0) / n;
  const den = points.reduce((s, p) => s + (p.at - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = points.reduce((s, p) => s + (p.at - mx) * (p.value - my), 0) / den;
  const x1 = points[0].at;
  const x2 = points[n - 1].at;
  return { x1, y1: my + slope * (x1 - mx), x2, y2: my + slope * (x2 - mx), slopePerDay: slope * DAY_MS };
}

/** Change from the first to the last point, or null with fewer than two. */
export function change(points) {
  if (points.length < 2) return null;
  return Math.round((points[points.length - 1].value - points[0].value) * 10) / 10;
}

/** Body-weight entries ({ kg, at }) as chart points inside the period, oldest first. */
export function bodyWeightPoints(entries, since) {
  return entries
    .filter((e) => typeof e.kg === 'number' && (e.at || 0) >= since)
    .map((e) => ({ at: e.at, value: e.kg }))
    .sort((a, b) => a.at - b.at);
}

/**
 * Sets that beat everything logged before them (heavier, or the same weight with more reps; longer hold for
 * timed exercises). A first-ever set is a baseline, not a record. One entry per exercise: its latest record
 * at or after `since`, newest first.
 */
export function recentRecords(sets, since, limit = 5) {
  const ordered = [...sets].sort((a, b) => (a.at || 0) - (b.at || 0));
  const best = new Map();
  const latest = new Map();
  for (const s of ordered) {
    const w = isTimed(s) ? 0 : s.weightKg || 0;
    const r = isTimed(s) ? s.durationSec || 0 : s.reps || 0;
    const prev = best.get(s.exerciseId);
    if (!prev) { best.set(s.exerciseId, { w, r }); continue; }
    if (w > prev.w || (w === prev.w && r > prev.r)) {
      best.set(s.exerciseId, { w, r });
      if ((s.at || 0) >= since) latest.set(s.exerciseId, { exerciseId: s.exerciseId, at: s.at || 0, weightKg: w, reps: isTimed(s) ? 0 : r, durationSec: isTimed(s) ? r : undefined });
    }
  }
  return [...latest.values()].sort((a, b) => b.at - a.at).slice(0, limit);
}
