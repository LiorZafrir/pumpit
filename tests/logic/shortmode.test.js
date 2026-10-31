import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSeconds, pairExercises, shortRestSec, shortenPlan } from '../../js/logic/shortmode.js';
import { planWorkout } from '../../js/logic/planner.js';

const item = (id, muscle, sets = 3) => ({ exerciseId: id, muscle, sets, repsMin: 8, repsMax: 12 });
const base = { goal: 'mass', level: 'adv', injuries: [] };

test('rest is shortened but never below 30 seconds', () => {
  assert.equal(shortRestSec(90), 55);
  assert.equal(shortRestSec(30), 30);
  assert.equal(shortRestSec(300), 180);
});

test('pairing prefers opposite muscles and keeps partners adjacent', () => {
  const paired = pairExercises([item('a', 'chest'), item('b', 'shoulders'), item('c', 'back'), item('d', 'biceps')]);
  assert.deepEqual(paired.map((p) => p.exerciseId), ['a', 'c', 'b', 'd']);
  assert.deepEqual(paired.map((p) => Boolean(p.pair)), [true, false, true, false]);
});

test('pairing never pairs two exercises for the same muscle, and leaves a spare one alone', () => {
  const paired = pairExercises([item('a', 'chest'), item('b', 'chest'), item('c', 'quads')]);
  assert.deepEqual(paired.map((p) => p.exerciseId), ['a', 'c', 'b']);
  assert.equal(paired[2].pair, undefined);
  const same = pairExercises([item('a', 'chest'), item('b', 'chest')]);
  assert.ok(same.every((p) => !p.pair));
});

test('pairing does not change its input and keeps every exercise once', () => {
  const input = [item('a', 'chest'), item('b', 'back'), item('c', 'quads')];
  const snapshot = JSON.stringify(input);
  const paired = pairExercises(input);
  assert.equal(JSON.stringify(input), snapshot);
  assert.deepEqual(paired.map((p) => p.exerciseId).sort(), ['a', 'b', 'c']);
});

test('a superset needs fewer rests than the same exercises done one after another', () => {
  const plain = [item('a', 'chest', 4), item('b', 'back', 4)];
  const paired = pairExercises(plain);
  assert.ok(estimateSeconds(paired, 90) < estimateSeconds(plain, 90));
});

test('estimate: one exercise of 3 sets with 90s rest', () => {
  assert.equal(estimateSeconds([item('a', 'chest', 3)], 90), 3 * 45 + 2 * 90 + 60);
});

test('shortenPlan fits the requested time when it can, and keeps every muscle', () => {
  const { exercises } = planWorkout({ ...base, sessionType: 'push', location: 'gym' });
  const muscles = new Set(exercises.map((e) => e.muscle));
  for (const minutes of [45, 30, 20]) {
    const out = shortenPlan(exercises, minutes, 90);
    assert.ok(out.estimateSec <= minutes * 60, `${minutes}: ${out.estimateSec}`);
    assert.deepEqual(new Set(out.exercises.map((e) => e.muscle)), muscles);
    assert.equal(out.restSec, 55);
  }
});

test('a shorter target never gives a longer plan', () => {
  const { exercises } = planWorkout({ ...base, sessionType: 'upper', location: 'gym' });
  const e = (m) => shortenPlan(exercises, m, 90).estimateSec;
  assert.ok(e(20) <= e(30) && e(30) <= e(45));
});

test('shortenPlan with an impossible target returns the shortest plan instead of failing', () => {
  const { exercises } = planWorkout({ ...base, sessionType: 'upper', location: 'gym' });
  const out = shortenPlan(exercises, 1, 90);
  assert.ok(out.exercises.length >= 1);
  assert.ok(out.exercises.every((x) => x.sets >= 2));
});

test('shortenPlan does not change its input', () => {
  const { exercises } = planWorkout({ ...base, sessionType: 'push', location: 'gym' });
  const snapshot = JSON.stringify(exercises);
  shortenPlan(exercises, 20, 90);
  assert.equal(JSON.stringify(exercises), snapshot);
});

test('only as much is done as needed: a generous target keeps full sets and no pairs', () => {
  const { exercises } = planWorkout({ ...base, sessionType: 'push', location: 'gym' });
  const out = shortenPlan(exercises, 90, 90);
  assert.ok(out.exercises.every((e) => !e.pair));
  assert.deepEqual(out.exercises.map((e) => e.sets), exercises.map((e) => e.sets));
  assert.equal(out.restSec, 55);
});

test('alwaysPair pairs even when time is not an issue', () => {
  const { exercises } = planWorkout({ ...base, sessionType: 'push', location: 'gym' });
  const out = shortenPlan(exercises, 90, 90, { alwaysPair: true });
  assert.ok(out.exercises.some((e) => e.pair));
});
