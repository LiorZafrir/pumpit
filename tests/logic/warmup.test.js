import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWarmup, warmupSeconds, warmupSetWeight } from '../../js/logic/warmup.js';
import { WARMUP_AREAS, WARMUP_MOVES } from '../../js/data/warmups.js';
import { LOCAL_EXERCISES, MUSCLES } from '../../js/data/local-exercises.js';

const areasOf = (moves) => moves.map((m) => m.area);

test('every move is complete and in a known area', () => {
  const ids = new Set();
  for (const m of WARMUP_MOVES) {
    assert.ok(m.name && m.steps.length >= 1 && m.sec >= 20 && m.sec <= 90, m.id);
    assert.ok(WARMUP_AREAS.includes(m.area), m.id);
    assert.ok(!ids.has(m.id), `duplicate id ${m.id}`);
    ids.add(m.id);
  }
});

test('an upper-body workout warms up the upper body, not the legs', () => {
  const moves = buildWarmup(['chest', 'back', 'biceps']);
  assert.deepEqual(areasOf(moves), ['general', 'upper', 'upper']);
});

test('a lower-body workout warms up the legs', () => {
  assert.deepEqual(areasOf(buildWarmup(['quads', 'hamstrings', 'calves'])), ['general', 'lower', 'lower']);
});

test('full-body and core workouts also get a core move', () => {
  assert.deepEqual(areasOf(buildWarmup(['quads', 'chest'])), ['general', 'upper', 'upper', 'lower', 'lower', 'core']);
  assert.deepEqual(areasOf(buildWarmup(['core'])), ['general', 'core']);
});

test('every muscle in the catalog gets a warm-up that starts with the general move', () => {
  for (const muscle of MUSCLES) {
    const moves = buildWarmup([muscle]);
    assert.ok(moves.length >= 2, muscle);
    assert.equal(moves[0].area, 'general');
  }
});

test('a warm-up stays short: at most about six minutes', () => {
  const all = buildWarmup(LOCAL_EXERCISES.map((e) => e.muscle));
  assert.ok(warmupSeconds(all) <= 6 * 60, String(warmupSeconds(all)));
  assert.equal(warmupSeconds([]), 0);
});

test('the warm-up set is half the working weight in 2.5 kg steps, and not offered for tiny weights', () => {
  assert.equal(warmupSetWeight(60), 30);
  assert.equal(warmupSetWeight(72.5), 37.5);
  assert.equal(warmupSetWeight(10), 5);
  assert.equal(warmupSetWeight(9), null);
  assert.equal(warmupSetWeight(0), null);
  assert.equal(warmupSetWeight(undefined), null);
});
