import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LONG_OPTIONS, MAX_EXERCISES, MAX_SETS, estimateSeconds, growPlan, pairExercises, shortRestSec, shortenPlan } from '../../js/logic/shortmode.js';
import { SLOTS, planWorkout } from '../../js/logic/planner.js';

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

test('a reserve (the warm-up) is taken off the available time', () => {
  const { exercises } = planWorkout({ ...base, sessionType: 'push', location: 'gym' });
  const withReserve = shortenPlan(exercises, 30, 90, { reserveSec: 300 });
  assert.ok(withReserve.estimateSec + 300 <= 30 * 60);
});

describe('growPlan', () => {
  const baseOf = (type) => planWorkout({ ...base, level: 'mid', sessionType: type, location: 'gym' }).exercises;
  const wide = (type) => planWorkout({ ...base, level: 'mid', sessionType: type, location: 'gym', maxExercises: 10, slots: [...SLOTS[type], ...SLOTS[type]] }).exercises;

  it('a long workout is longer than the normal one and still fits the time', () => {
    const normal = baseOf('upper');
    const all = wide('upper');
    for (const minutes of LONG_OPTIONS) {
      const out = growPlan(normal, all.slice(normal.length), minutes, 90);
      assert.ok(out.estimateSec <= minutes * 60, `${minutes}: ${out.estimateSec}`);
      assert.ok(out.estimateSec > estimateSeconds(normal, 90), `${minutes} is not longer`);
    }
  });

  it('more minutes never give a shorter workout, and the limits hold', () => {
    const normal = baseOf('fullBody');
    const extras = wide('fullBody').slice(normal.length);
    const a = growPlan(normal, extras, 75, 90);
    const b = growPlan(normal, extras, 90, 90);
    assert.ok(b.estimateSec >= a.estimateSec);
    for (const out of [a, b]) {
      assert.ok(out.exercises.length <= MAX_EXERCISES);
      assert.ok(out.exercises.every((e) => e.sets <= MAX_SETS));
      // more time means more exercises, never more sets than the normal workout has
      assert.ok(out.exercises.every((e, i) => i >= normal.length || e.sets === normal[i].sets));
    }
  });

  it('keeps the base exercises first and in order, and does not change its input', () => {
    const normal = baseOf('push');
    const snapshot = JSON.stringify(normal);
    const out = growPlan(normal, wide('push').slice(normal.length), 90, 90);
    assert.deepEqual(out.exercises.slice(0, normal.length).map((e) => e.exerciseId), normal.map((e) => e.exerciseId));
    assert.equal(JSON.stringify(normal), snapshot);
  });

  it('with the reserve taken off it never overshoots', () => {
    const normal = baseOf('lower');
    const out = growPlan(normal, wide('lower').slice(normal.length), 75, 90, { reserveSec: 330 });
    assert.ok(out.estimateSec + 330 <= 75 * 60);
  });

  it('pairs when asked to', () => {
    const normal = baseOf('upper');
    const out = growPlan(normal, wide('upper').slice(normal.length), 90, 90, { alwaysPair: true });
    assert.ok(out.exercises.some((e) => e.pair));
  });
});
