import test from 'node:test';
import assert from 'node:assert/strict';
import { alternativesFor, swapPlanItem } from '../../js/logic/swap.js';
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
