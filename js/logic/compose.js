// Builds the next workout from the profile, the history and what the user picked on the home screen. Pure.
import { SLOTS, exerciseLimit, nextSessionAfter, planWorkout } from './planner.js';
import { focusTitle, normalizeFocus, slotsForFocus } from './focus.js';
import { recommendedSplit } from './split.js';
import { lastFinished } from './streak.js';
import { settingsOf } from './settings.js';
import { LONG_OPTIONS, MAX_EXERCISES, SHORT_OPTIONS, estimateSeconds, growPlan, pairExercises, shortenPlan } from './shortmode.js';
import { buildWarmup, warmupSeconds } from './warmup.js';

export function splitFor(profile) {
  const days = Math.min(6, Math.max(2, Number(profile.daysPerWeek) || 3));
  return recommendedSplit(days);
}

/**
 * The next workout and its exercises.
 * - `focus`: areas picked instead of the planned session (a "custom" session that does not move the rotation).
 * - `minutes`: 20, 30 or 45 trims the plan to fit and pairs it into supersets; 75 or 90 fills a long workout.
 * With the superset setting on, a normal plan is paired too. `estimateSec` is a rough length including the warm-up.
 * @param {{ profile: object, workouts: object[], location: 'gym'|'home', minutes?: number|null, focus?: string[] }} p
 */
export function composeWorkout({ profile, workouts, location, minutes = null, focus = [] }) {
  const settings = settingsOf(profile);
  const areas = normalizeFocus(focus);
  const custom = areas.length > 0;
  // Custom sessions are extra: the planned rotation continues from the last planned session.
  const planned = lastFinished(workouts.filter((w) => w.sessionType !== 'custom'));
  const next = custom
    ? { type: 'custom', index: undefined, variant: 0, focus: areas, title: focusTitle(areas) }
    : nextSessionAfter(splitFor(profile), planned?.sessionIndex);

  const base = {
    location, goal: profile.goal, level: profile.level,
    injuries: Array.isArray(profile.injuries) ? profile.injuries : [], variant: next.variant,
    gear: settings.homeGear, style: settings.homeStyle
  };
  const slots = custom ? slotsForFocus(areas) : null;
  const plan = planWorkout({
    ...base, sessionType: next.type, slots,
    maxExercises: custom ? Math.max(areas.length, exerciseLimit(profile.level)) : null
  });

  const warmSec = settings.warmup ? warmupSeconds(buildWarmup(plan.exercises.map((e) => e.muscle))) : 0;
  const options = { alwaysPair: settings.superset, reserveSec: warmSec };

  let exercises = plan.exercises;
  let rest = settings.restSec;
  // The same slots three times gives more exercises for the same muscles; the first ones are the normal workout.
  const grow = () => {
    const once = slots || SLOTS[next.type];
    const wider = planWorkout({ ...base, sessionType: next.type, maxExercises: MAX_EXERCISES, slots: [...once, ...once, ...once] });
    const extras = wider.exercises.filter((w) => !plan.exercises.some((e) => e.exerciseId === w.exerciseId));
    return growPlan(plan.exercises, extras, minutes, settings.restSec, options).exercises;
  };
  if (SHORT_OPTIONS.includes(minutes)) {
    const short = shortenPlan(exercises, minutes, settings.restSec, options);
    // The normal plan can be much shorter than the time the user has: then fill it up instead of leaving it at 30 of 45 minutes.
    if (short.estimateSec + warmSec + 7 * 60 < minutes * 60) {
      exercises = grow();
    } else {
      exercises = short.exercises;
      rest = short.restSec;
    }
  } else if (LONG_OPTIONS.includes(minutes)) {
    exercises = grow();
  } else if (settings.superset) {
    exercises = pairExercises(exercises);
  }

  return {
    next,
    plan: {
      ...plan, exercises,
      shortMin: SHORT_OPTIONS.includes(minutes) ? minutes : null,
      longMin: LONG_OPTIONS.includes(minutes) ? minutes : null,
      plannedSets: exercises.reduce((sum, e) => sum + e.sets, 0),
      estimateSec: estimateSeconds(exercises, rest) + warmSec
    }
  };
}
