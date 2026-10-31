import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSetDoc, buildWorkoutDoc, finishPatch, nextUp, partnerOf, positionFrom, progressFraction, setCounts, setDocId, toStoredPlanItem
} from '../../js/logic/workout-state.js';

const plan = [
  { exerciseId: 'a', sets: 2, repsMin: 6, repsMax: 10 },
  { exerciseId: 'b', sets: 2, durationSec: 30 },
  { exerciseId: 'c', sets: 1, repsMin: 8, repsMax: 12 }
];
const logged = (...ids) => ids.map((exerciseId, i) => ({ exerciseId, setIndex: i, weightKg: 10, reps: 8 }));

describe('positionFrom', () => {
  it('starts at the first set', () => {
    assert.deepEqual(positionFrom(plan, []), { exerciseIndex: 0, setIndex: 0, finished: false });
  });

  it('moves through sets and exercises in order', () => {
    assert.deepEqual(positionFrom(plan, logged('a')), { exerciseIndex: 0, setIndex: 1, finished: false });
    assert.deepEqual(positionFrom(plan, logged('a', 'a')), { exerciseIndex: 1, setIndex: 0, finished: false });
    assert.deepEqual(positionFrom(plan, logged('a', 'a', 'b', 'b')), { exerciseIndex: 2, setIndex: 0, finished: false });
  });

  it('is finished once every planned set is logged', () => {
    const r = positionFrom(plan, logged('a', 'a', 'b', 'b', 'c'));
    assert.equal(r.finished, true);
  });

  it('resumes correctly from sets in any order of arrival', () => {
    assert.deepEqual(positionFrom(plan, logged('b', 'a')), { exerciseIndex: 0, setIndex: 1, finished: false });
  });

  it('handles an empty plan', () => {
    assert.equal(positionFrom([], []).finished, true);
  });
});

describe('progress and counts', () => {
  it('counts sets per exercise and computes the overall fraction', () => {
    assert.deepEqual(setCounts(plan, logged('a', 'b', 'b')), [1, 2, 0]);
    assert.equal(progressFraction(plan, []), 0);
    assert.equal(progressFraction(plan, logged('a', 'a', 'b')), 3 / 5);
    assert.equal(progressFraction([], []), 0);
  });

  it('never exceeds 1 even with extra sets', () => {
    assert.equal(progressFraction(plan, logged('a', 'a', 'a', 'b', 'b', 'c')), 1);
  });
});

describe('nextUp', () => {
  it('is the next set of the same exercise, then the first set of the next exercise', () => {
    assert.deepEqual(nextUp(plan, logged('a'), 0), { exerciseIndex: 0, setIndex: 1, newExercise: false });
    assert.deepEqual(nextUp(plan, logged('a', 'a'), 0), { exerciseIndex: 1, setIndex: 0, newExercise: true });
  });

  it('is null after the last set', () => {
    assert.equal(nextUp(plan, logged('a', 'a', 'b', 'b', 'c'), 2), null);
  });
});

describe('supersets', () => {
  const pair = [
    { exerciseId: 'a', sets: 2, pair: true, repsMin: 8, repsMax: 12 },
    { exerciseId: 'b', sets: 2, repsMin: 8, repsMax: 12 },
    { exerciseId: 'c', sets: 1, repsMin: 8, repsMax: 12 }
  ];
  const at = (...ids) => positionFrom(pair, logged(...ids));

  it('alternates between the two exercises, then moves on', () => {
    assert.deepEqual(at(), { exerciseIndex: 0, setIndex: 0, finished: false });
    assert.deepEqual(at('a'), { exerciseIndex: 1, setIndex: 0, finished: false });
    assert.deepEqual(at('a', 'b'), { exerciseIndex: 0, setIndex: 1, finished: false });
    assert.deepEqual(at('a', 'b', 'a'), { exerciseIndex: 1, setIndex: 1, finished: false });
    assert.deepEqual(at('a', 'b', 'a', 'b'), { exerciseIndex: 2, setIndex: 0, finished: false });
    assert.equal(at('a', 'b', 'a', 'b', 'c').finished, true);
  });

  it('resumes correctly from sets logged in any order', () => {
    assert.deepEqual(at('b', 'a'), { exerciseIndex: 0, setIndex: 1, finished: false });
  });

  it('handles pairs with different set counts', () => {
    const uneven = [{ exerciseId: 'a', sets: 1, pair: true }, { exerciseId: 'b', sets: 3 }];
    assert.deepEqual(positionFrom(uneven, logged('a', 'b')), { exerciseIndex: 1, setIndex: 1, finished: false });
    assert.deepEqual(positionFrom(uneven, logged('a', 'b', 'b')), { exerciseIndex: 1, setIndex: 2, finished: false });
    assert.equal(positionFrom(uneven, logged('a', 'b', 'b', 'b')).finished, true);
  });

  it('nextUp follows the pair, and progress counts every set', () => {
    assert.deepEqual(nextUp(pair, logged('a'), 0), { exerciseIndex: 1, setIndex: 0, newExercise: false });
    assert.deepEqual(nextUp(pair, logged('a', 'b', 'a', 'b'), 1), { exerciseIndex: 2, setIndex: 0, newExercise: true });
    assert.equal(progressFraction(pair, logged('a', 'b')), 2 / 5);
  });

  it('partnerOf finds the other half of a pair from either side', () => {
    assert.equal(partnerOf(pair, 0), 1);
    assert.equal(partnerOf(pair, 1), 0);
    assert.equal(partnerOf(pair, 2), -1);
  });

  it('the stored plan keeps the pair flag only when true', () => {
    assert.equal(toStoredPlanItem({ exerciseId: 'a', sets: 2, pair: true }).pair, true);
    assert.equal('pair' in toStoredPlanItem({ exerciseId: 'a', sets: 2 }), false);
  });
});

describe('drop sets and short workouts in documents', () => {
  it('buildSetDoc keeps drops (cleaned, at most 6) for weighted sets only', () => {
    const item = { exerciseId: 'a', sets: 3, repsMin: 8, repsMax: 12 };
    const drops = Array.from({ length: 8 }, (_, i) => ({ reps: 8.4 + i, weightKg: 50 - i * 5.04 }));
    const doc = buildSetDoc({ workoutId: 'w', planItem: item, setIndex: 0, reps: 8, weightKg: 60, drops, now: 1 });
    assert.equal(doc.drops.length, 6);
    assert.deepEqual(doc.drops[0], { reps: 8, weightKg: 50 });
    assert.equal(buildSetDoc({ workoutId: 'w', planItem: item, setIndex: 0, reps: 8, weightKg: 60, now: 1 }).drops, undefined);
    assert.equal(buildSetDoc({ workoutId: 'w', planItem: item, setIndex: 0, reps: 8, weightKg: 60, drops: [], now: 1 }).drops, undefined);
    const timed = buildSetDoc({ workoutId: 'w', planItem: { exerciseId: 'p', sets: 1, durationSec: 30 }, setIndex: 0, reps: 0, weightKg: 0, durationSec: 30, drops, now: 1 });
    assert.equal(timed.drops, undefined);
  });

  it('buildWorkoutDoc stores shortMin only when given', () => {
    const base = { now: 1, location: 'gym', title: 't', sessionType: 'upper', sessionIndex: 0, plan };
    assert.equal('shortMin' in buildWorkoutDoc(base), false);
    assert.equal(buildWorkoutDoc({ ...base, shortMin: 30 }).shortMin, 30);
  });
});

describe('documents', () => {
  const now = new Date(2026, 9, 30, 21, 5).getTime();

  it('buildWorkoutDoc has only allowed fields, no undefined values, and a local date', () => {
    const allowed = ['date', 'location', 'title', 'sessionType', 'sessionIndex', 'plan', 'startedAt', 'endedAt',
      'durationSec', 'plannedSets', 'completedSets', 'volumeKg', 'status', 'shortMin'];
    const doc = buildWorkoutDoc({ now, location: 'gym', title: 'אימון', sessionType: 'upper', sessionIndex: 0, plan });
    for (const [k, v] of Object.entries(doc)) {
      assert.ok(allowed.includes(k), k);
      assert.notEqual(v, undefined);
    }
    assert.equal(doc.date, '2026-10-30');
    assert.equal(doc.plannedSets, 5);
    assert.equal(doc.status, 'active');
    assert.deepEqual(doc.plan[1], { exerciseId: 'b', sets: 2, durationSec: 30 });
    assert.deepEqual(Object.keys(doc.plan[0]).sort(), ['exerciseId', 'repsMax', 'repsMin', 'sets']);
  });

  it('buildSetDoc for a weighted set rounds values and omits durationSec', () => {
    const doc = buildSetDoc({ workoutId: 'w', planItem: plan[0], setIndex: 1, reps: 8.4, weightKg: 62.46, targetReps: 10, targetWeightKg: 62.5, now });
    assert.deepEqual(doc, { workoutId: 'w', exerciseId: 'a', setIndex: 1, reps: 8, weightKg: 62.5, targetReps: 10, targetWeightKg: 62.5, at: now });
    assert.equal('durationSec' in doc, false);
  });

  it('buildSetDoc for a timed set stores seconds with zero reps and weight', () => {
    const doc = buildSetDoc({ workoutId: 'w', planItem: plan[1], setIndex: 0, reps: 99, weightKg: 99, durationSec: 31.6, now });
    assert.equal(doc.reps, 0);
    assert.equal(doc.weightKg, 0);
    assert.equal(doc.durationSec, 32);
  });

  it('buildSetDoc never produces negative numbers', () => {
    const doc = buildSetDoc({ workoutId: 'w', planItem: plan[0], setIndex: 0, reps: -3, weightKg: -5, now });
    assert.equal(doc.reps, 0);
    assert.equal(doc.weightKg, 0);
  });

  it('setDocId is deterministic so a set can be re-saved without duplicates', () => {
    assert.equal(setDocId('w1', 2, 3), 'w1_2_3');
  });

  it('finishPatch computes duration, completed sets and volume', () => {
    const patch = finishPatch({ startedAt: now }, [{ weightKg: 50, reps: 10 }, { weightKg: 50, reps: 8 }], now + 45 * 60 * 1000);
    assert.deepEqual(patch, { status: 'done', endedAt: now + 2700000, durationSec: 2700, completedSets: 2, volumeKg: 900 });
  });
});
