import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyWeightPoints, change, exerciseSeries, exercisesWithData, metricOf, periodStart, recentRecords, trendLine } from '../../js/logic/progress.js';

const DAY = 86400000;
const set = (workoutId, at, weightKg, reps, extra = {}) => ({ workoutId, at, weightKg, reps, exerciseId: 'a', ...extra });

test('periodStart goes back 30, 90 or 365 days, defaulting to a month', () => {
  assert.equal(periodStart('month', 100 * DAY), 70 * DAY);
  assert.equal(periodStart('quarter', 100 * DAY), 10 * DAY);
  assert.equal(periodStart('year', 400 * DAY), 35 * DAY);
  assert.equal(periodStart('nonsense', 100 * DAY), 70 * DAY);
});

test('metric: time for timed sets, weight when loaded, reps for bodyweight', () => {
  assert.equal(metricOf([{ durationSec: 30, reps: 0, weightKg: 0 }]), 'time');
  assert.equal(metricOf([set('w', 1, 20, 8)]), 'weight');
  assert.equal(metricOf([set('w', 1, 0, 12)]), 'reps');
});

test('series has one point per workout with the best value, oldest first', () => {
  const sets = [set('w2', 2 * DAY, 60, 8), set('w1', DAY, 50, 10), set('w1', DAY + 1, 55, 6), set('w2', 2 * DAY + 1, 57.5, 8)];
  const { metric, points } = exerciseSeries(sets);
  assert.equal(metric, 'weight');
  assert.deepEqual(points, [{ at: DAY + 1, value: 55 }, { at: 2 * DAY + 1, value: 60 }]);
});

test('bodyweight exercises chart reps, timed exercises chart seconds', () => {
  assert.deepEqual(exerciseSeries([set('w1', 1, 0, 12), set('w1', 2, 0, 15)]).points.map((p) => p.value), [15]);
  assert.deepEqual(exerciseSeries([{ workoutId: 'w', at: 1, reps: 0, weightKg: 0, durationSec: 45 }]).points.map((p) => p.value), [45]);
});

test('exercisesWithData lists the most recently trained first', () => {
  const sets = [{ exerciseId: 'a', at: 5 }, { exerciseId: 'b', at: 9 }, { exerciseId: 'a', at: 3 }];
  assert.deepEqual(exercisesWithData(sets), ['b', 'a']);
});

test('trendLine fits a straight rising line', () => {
  const t = trendLine([{ at: 0, value: 10 }, { at: DAY, value: 12 }, { at: 2 * DAY, value: 14 }]);
  assert.equal(Math.round(t.y1 * 100) / 100, 10);
  assert.equal(Math.round(t.y2 * 100) / 100, 14);
  assert.equal(Math.round(t.slopePerDay * 100) / 100, 2);
});

test('trendLine needs two points at different times', () => {
  assert.equal(trendLine([]), null);
  assert.equal(trendLine([{ at: 1, value: 5 }]), null);
  assert.equal(trendLine([{ at: 1, value: 5 }, { at: 1, value: 6 }]), null);
});

test('change is last minus first, rounded, null with a single point', () => {
  assert.equal(change([{ at: 1, value: 80.4 }, { at: 2, value: 79.1 }]), -1.3);
  assert.equal(change([{ at: 1, value: 80 }]), null);
});

test('bodyWeightPoints filters by period and sorts', () => {
  const entries = [{ kg: 80, at: 5 * DAY }, { kg: 82, at: DAY }, { kg: 81, at: 3 * DAY }, { kg: 'x', at: 4 * DAY }];
  assert.deepEqual(bodyWeightPoints(entries, 2 * DAY).map((p) => p.value), [81, 80]);
});

test('records: the first set is a baseline, later heavier or higher-rep sets are records', () => {
  const sets = [set('w1', 1 * DAY, 50, 8), set('w2', 2 * DAY, 50, 10), set('w3', 3 * DAY, 52.5, 6), set('w4', 4 * DAY, 50, 12)];
  const records = recentRecords(sets, 0);
  assert.equal(records.length, 1);
  assert.deepEqual([records[0].at, records[0].weightKg, records[0].reps], [3 * DAY, 52.5, 6]);
});

test('records older than the period are left out, newest first, limited', () => {
  const sets = [
    set('w1', DAY, 40, 8), set('w2', 2 * DAY, 45, 8),
    { ...set('w1', DAY, 10, 8), exerciseId: 'b' }, { ...set('w2', 5 * DAY, 12, 8), exerciseId: 'b' }
  ];
  assert.deepEqual(recentRecords(sets, 3 * DAY).map((r) => r.exerciseId), ['b']);
  assert.deepEqual(recentRecords(sets, 0).map((r) => r.exerciseId), ['b', 'a']);
  assert.equal(recentRecords(sets, 0, 1).length, 1);
});

test('timed records compare hold time', () => {
  const t = (at, d) => ({ exerciseId: 'p', workoutId: `w${at}`, at, reps: 0, weightKg: 0, durationSec: d });
  const records = recentRecords([t(1, 30), t(2, 40), t(3, 35)], 0);
  assert.equal(records[0].durationSec, 40);
});
