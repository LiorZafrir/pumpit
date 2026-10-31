import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExercise, regionOf, setVolume, workoutVolume } from '../../js/logic/progression.js';

const plan = { sets: 3, repsMin: 6, repsMax: 10 };
const sets = (...pairs) => pairs.map(([weightKg, reps], i) => ({ setIndex: i, weightKg, reps }));
const evalChest = (s, prev = null, planItem = plan, muscle = 'chest') =>
  evaluateExercise({ planItem, muscle, sets: s, prev, now: 1000 });

describe('volume', () => {
  it('multiplies weight by reps and sums, rounded to 0.1', () => {
    assert.equal(setVolume({ weightKg: 60, reps: 8 }), 480);
    assert.equal(setVolume({ reps: 12 }), 0);
    assert.equal(workoutVolume(sets([62.5, 8], [62.5, 7], [60, 6])), 1297.5); // 500 + 437.5 + 360
    assert.equal(workoutVolume([]), 0);
    assert.equal(setVolume({ weightKg: 60, reps: 8, drops: [{ weightKg: 50, reps: 6 }, { weightKg: 40, reps: 5 }] }), 480 + 300 + 200);
  });
});

describe('regionOf', () => {
  it('maps leg muscles to lower and everything else to upper', () => {
    for (const m of ['quads', 'hamstrings', 'glutes', 'calves']) assert.equal(regionOf(m), 'lower');
    for (const m of ['chest', 'back', 'shoulders', 'rear', 'biceps', 'triceps', 'core']) assert.equal(regionOf(m), 'upper');
  });
});

describe('evaluateExercise: progression', () => {
  it('adds 2.5 kg to an upper-body lift when every set reached the top of the range', () => {
    const r = evalChest(sets([60, 10], [60, 10], [60, 10]));
    assert.equal(r.next.weightKg, 62.5);
    assert.equal(r.next.targetReps, 6);
    assert.equal(r.next.increased, true);
    assert.equal(r.newState.workingWeightKg, 62.5);
  });

  it('adds 5 kg to a lower-body lift', () => {
    const r = evalChest(sets([100, 10], [100, 10], [100, 10]), null, plan, 'quads');
    assert.equal(r.next.weightKg, 105);
  });

  it('keeps the weight and aims for the top of the range when not every set got there', () => {
    const r = evalChest(sets([60, 10], [60, 9], [60, 8]));
    assert.equal(r.next.weightKg, 60);
    assert.equal(r.next.targetReps, 10);
    assert.equal(r.next.increased, false);
  });

  it('does not add weight if the planned sets were not all completed', () => {
    const r = evalChest(sets([60, 10], [60, 10]));
    assert.equal(r.next.increased, false);
    assert.equal(r.outcome, 'partial');
  });

  it('bodyweight exercises never get a weight increase', () => {
    const r = evalChest(sets([0, 10], [0, 10], [0, 10]), null, plan, 'chest');
    assert.equal(r.next.weightKg, 0);
    assert.equal(r.next.increased, false);
    assert.equal(r.next.bodyweight, true);
  });

  it('caps the weight at 600', () => {
    const r = evalChest(sets([599, 10], [599, 10], [599, 10]), null, plan, 'quads');
    assert.equal(r.newState.workingWeightKg, 600);
  });

  it('uses the heaviest set as the working weight', () => {
    const r = evalChest(sets([50, 10], [60, 10], [60, 8]));
    assert.equal(r.newState.workingWeightKg, 60);
  });
});

describe('evaluateExercise: records and outcomes', () => {
  const prev = { workingWeightKg: 60, prWeightKg: 60, prReps: 8, lastReps: [8, 8, 8] };

  it('the first time only sets a baseline: no PR, outcome done', () => {
    const r = evalChest(sets([60, 8], [60, 8], [60, 8]));
    assert.equal(r.outcome, 'done');
    assert.equal(r.newState.prWeightKg, 60);
    assert.equal(r.newState.prReps, 8);
  });

  it('a heavier weight is a PR', () => {
    const r = evalChest(sets([62.5, 6], [60, 8], [60, 8]), prev);
    assert.equal(r.outcome, 'pr');
    assert.equal(r.newState.prWeightKg, 62.5);
    assert.equal(r.newState.prReps, 6);
  });

  it('more reps at the same weight is a PR', () => {
    const r = evalChest(sets([60, 9], [60, 8], [60, 8]), prev);
    assert.equal(r.outcome, 'pr');
    assert.equal(r.newState.prReps, 9);
  });

  it('matching the record is not a PR', () => {
    const r = evalChest(sets([60, 8], [60, 8], [60, 7]), prev);
    assert.equal(r.outcome, 'done');
    assert.equal(r.newState.prWeightKg, 60);
    assert.equal(r.newState.prReps, 8);
  });

  it('a lighter workout keeps the old record', () => {
    const r = evalChest(sets([50, 10], [50, 10], [50, 10]), prev);
    assert.equal(r.newState.prWeightKg, 60);
    assert.equal(r.outcome, 'done');
  });

  it('no logged sets is skipped and leaves the state alone', () => {
    const r = evalChest([], prev);
    assert.equal(r.outcome, 'skipped');
    assert.equal(r.newState, null);
  });

  it('records lastReps and lastDoneAt', () => {
    const r = evalChest(sets([60, 8], [60, 7], [60, 6]));
    assert.deepEqual(r.newState.lastReps, [8, 7, 6]);
    assert.equal(r.newState.lastDoneAt, 1000);
  });
});

describe('evaluateExercise: timed exercises', () => {
  const timedPlan = { sets: 3, durationSec: 30 };
  const held = (...secs) => secs.map((durationSec, i) => ({ setIndex: i, reps: 0, weightKg: 0, durationSec }));

  it('stores holds in seconds and never changes weight', () => {
    const r = evaluateExercise({ planItem: timedPlan, muscle: 'core', sets: held(30, 30, 30), prev: null, now: 5 });
    assert.equal(r.newState.workingWeightKg, 0);
    assert.deepEqual(r.newState.lastReps, [30, 30, 30]);
    assert.equal(r.next.timed, true);
    assert.equal(r.outcome, 'done');
  });

  it('a longer hold than the record is a PR', () => {
    const prev = { workingWeightKg: 0, prWeightKg: 0, prReps: 30 };
    const r = evaluateExercise({ planItem: timedPlan, muscle: 'core', sets: held(40, 30, 30), prev, now: 5 });
    assert.equal(r.outcome, 'pr');
    assert.equal(r.newState.prReps, 40);
  });
});
