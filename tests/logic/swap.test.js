import test from 'node:test';
import assert from 'node:assert/strict';
import { addPlanItem, addableExercises, alternativesFor, rePair, removePlanItem, swapPlanItem } from '../../js/logic/swap.js';
import { composeWorkout, estimateEdited } from '../../js/logic/compose.js';
import { MAX_EXERCISES } from '../../js/logic/shortmode.js';
import { planWorkout } from '../../js/logic/planner.js';
import { toStoredPlanItem } from '../../js/logic/workout-state.js';
import { exerciseById } from '../../js/data/local-exercises.js';

const base = { sessionType: 'push', location: 'gym', goal: 'mass', level: 'mid', injuries: [] };
// Same shape as the stored workout document: ids and prescription only.
const plan = () => planWorkout(base).exercises.map(toStoredPlanItem);
const ctx = { location: 'gym', level: 'mid', injuries: [] };

test('alternatives are the same muscle and exclude exercises already in the plan', () => {
  const p = plan();
  const alts = alternativesFor(p, 0, ctx);
  assert.ok(alts.length > 0);
  assert.ok(alts.every((e) => e.muscle === exerciseById(p[0].exerciseId).muscle));
  const inPlan = new Set(p.map((x) => x.exerciseId));
  assert.ok(alts.every((e) => !inPlan.has(e.id)));
});

test('alternatives respect location, level and injuries', () => {
  const p = plan();
  const home = alternativesFor(p, 0, { ...ctx, location: 'home' });
  assert.ok(home.every((e) => e.location.includes('home')));
  const beginner = alternativesFor(p, 0, { ...ctx, level: 'beg' });
  assert.ok(beginner.every((e) => e.level === 'beg'));
  const hurt = alternativesFor(p, 0, { ...ctx, injuries: ['shoulders', 'wrists', 'elbows'] });
  assert.ok(hurt.every((e) => !e.loads.some((a) => ['shoulders', 'wrists', 'elbows'].includes(a))));
});

test('unknown index gives no alternatives', () => {
  assert.deepEqual(alternativesFor(plan(), 99, ctx), []);
});

test('swapPlanItem replaces only the chosen item with a fresh prescription', () => {
  const p = plan();
  const replacement = alternativesFor(p, 0, ctx)[0];
  const next = swapPlanItem(p, 0, replacement, { goal: 'mass', level: 'mid' });
  assert.equal(next.length, p.length);
  assert.equal(next[0].exerciseId, replacement.id);
  assert.deepEqual(Object.keys(next[0]).sort(), ['exerciseId', 'repsMax', 'repsMin', 'sets']);
  assert.equal(next[0].sets, 4);
  assert.deepEqual(next.slice(1), p.slice(1));
  assert.equal(p[0].exerciseId !== replacement.id, true, 'original plan is not mutated');
});

test('swapping to a timed exercise gives a hold time instead of reps', () => {
  const plank = exerciseById('local-plank');
  const next = swapPlanItem(plan(), 0, plank, { goal: 'mass', level: 'mid' });
  assert.equal(next[0].durationSec, 40);
  assert.equal(next[0].repsMin, undefined);
});

test('a swapped slot keeps its superset flag and does not get more sets than it had', () => {
  const p = plan().map((item, i) => (i === 0 ? { ...item, sets: 2, pair: true } : item));
  const replacement = alternativesFor(p, 0, ctx)[0];
  const next = swapPlanItem(p, 0, replacement, { goal: 'mass', level: 'mid' });
  assert.equal(next[0].pair, true);
  assert.equal(next[0].sets, 2);
  assert.equal('pair' in swapPlanItem(plan(), 1, alternativesFor(plan(), 1, ctx)[0], { goal: 'mass', level: 'mid' })[1], false);
});

const editCtx = { location: 'gym', level: 'mid', goal: 'mass', injuries: [], gear: [], style: 'regular' };
const editProfile = { goal: 'mass', level: 'mid', daysPerWeek: 4, injuries: [], settings: {} };
const suggested = () => composeWorkout({ profile: editProfile, workouts: [], location: 'gym' }).plan.exercises;

test('removing an exercise keeps the others in order', () => {
  const p = suggested();
  const out = removePlanItem(p, 1);
  assert.deepEqual(out.map((e) => e.exerciseId), p.filter((_, i) => i !== 1).map((e) => e.exerciseId));
});

test('addable exercises are not in the plan already and are safe for the injuries', () => {
  const p = suggested();
  const options = addableExercises(p, { ...editCtx, injuries: ['shoulders'] });
  assert.ok(options.length > 0);
  for (const e of options) {
    assert.ok(!p.some((x) => x.exerciseId === e.id));
    assert.ok(!e.loads.includes('shoulders'));
  }
});

test('adding puts the exercise last, never twice and never beyond the limit', () => {
  const p = suggested();
  const ex = addableExercises(p, editCtx)[0];
  const out = addPlanItem(p, ex, editCtx);
  assert.equal(out.length, p.length + 1);
  assert.equal(out.at(-1).exerciseId, ex.id);
  assert.ok(out.at(-1).sets <= Math.max(...p.map((e) => e.sets)));
  assert.equal(addPlanItem(out, ex, editCtx).length, out.length);
  let full = out;
  for (const e of addableExercises(out, editCtx)) full = addPlanItem(full, e, editCtx);
  assert.ok(full.length <= MAX_EXERCISES);
});

test('pairing again after an edit leaves no leader without a partner', () => {
  const p = rePair(removePlanItem(rePair(suggested(), true), 0), true);
  for (let i = 0; i < p.length; i++) if (p[i].pair) assert.ok(p[i + 1]);
  assert.ok(rePair(p, false).every((e) => !e.pair));
});

test('an edited list with fewer exercises is estimated shorter', () => {
  const p = suggested();
  assert.ok(estimateEdited({ profile: editProfile, exercises: removePlanItem(p, 0) }) < estimateEdited({ profile: editProfile, exercises: p }));
});
