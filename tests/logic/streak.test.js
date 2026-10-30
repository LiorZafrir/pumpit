import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { activeWorkout, doneDates, doneThisWeek, lastFinished, weekStartKey, weeklyStreak } from '../../js/logic/streak.js';

const done = (date, startedAt = 0) => ({ date, status: 'done', startedAt });
const now = new Date(2026, 9, 29); // Thursday; this week is 25-31 Oct

describe('weekStartKey', () => {
  it('returns the Sunday of the week, across month and year boundaries', () => {
    assert.equal(weekStartKey('2026-10-29'), '2026-10-25');
    assert.equal(weekStartKey('2026-10-25'), '2026-10-25');
    assert.equal(weekStartKey('2026-10-31'), '2026-10-25');
    assert.equal(weekStartKey('2027-01-01'), '2026-12-27');
  });
});

describe('doneThisWeek and doneDates', () => {
  const list = [done('2026-10-26'), done('2026-10-28'), done('2026-10-20'), { date: '2026-10-27', status: 'active' }];
  it('counts only finished workouts of the current week', () => {
    assert.equal(doneThisWeek(list, now), 2);
  });
  it('collects the dates of finished workouts only', () => {
    assert.deepEqual([...doneDates(list)].sort(), ['2026-10-20', '2026-10-26', '2026-10-28']);
  });
});

describe('weeklyStreak', () => {
  const week = (start, n) => Array.from({ length: n }, (_, i) => done(`${start.slice(0, 8)}${String(Number(start.slice(8)) + i).padStart(2, '0')}`));

  it('is 0 with no workouts or no goal', () => {
    assert.equal(weeklyStreak([], 3, now), 0);
    assert.equal(weeklyStreak([done('2026-10-26')], 0, now), 0);
  });

  it('counts consecutive past weeks that met the goal', () => {
    const list = [...week('2026-10-18', 3), ...week('2026-10-11', 3), ...week('2026-10-04', 3)];
    assert.equal(weeklyStreak(list, 3, now), 3);
  });

  it('an unfinished current week does not break the streak, a met one adds to it', () => {
    const past = [...week('2026-10-18', 3), ...week('2026-10-11', 3)];
    assert.equal(weeklyStreak([...past, done('2026-10-26')], 3, now), 2);
    assert.equal(weeklyStreak([...past, ...week('2026-10-25', 3)], 3, now), 3);
  });

  it('stops at the first missed week', () => {
    const list = [...week('2026-10-18', 3), ...week('2026-10-04', 3)]; // week of 11 Oct missing
    assert.equal(weeklyStreak(list, 3, now), 1);
  });

  it('ignores active workouts', () => {
    const list = [...week('2026-10-18', 2), { date: '2026-10-20', status: 'active' }];
    assert.equal(weeklyStreak(list, 3, now), 0);
  });
});

describe('lastFinished and activeWorkout', () => {
  it('pick the most recently started', () => {
    const list = [done('2026-10-20', 100), done('2026-10-26', 300), { id: 'x', status: 'active', startedAt: 200 }, { id: 'y', status: 'active', startedAt: 400 }];
    assert.equal(lastFinished(list).startedAt, 300);
    assert.equal(activeWorkout(list).id, 'y');
    assert.equal(activeWorkout([done('2026-10-20')]), null);
    assert.equal(lastFinished([]), null);
  });
});
