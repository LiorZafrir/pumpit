import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LOCAL_EXERCISES, MUSCLES, exerciseById } from '../../js/data/local-exercises.js';
import { INJURY_AREAS } from '../../js/logic/onboarding.js';
import { SLOTS, nextSession, planWorkout } from '../../js/logic/planner.js';
import { recommendedSplit } from '../../js/logic/split.js';

const base = { goal: 'mass', level: 'mid', injuries: [] };
const types = Object.keys(SLOTS);

describe('catalog', () => {
  it('has unique ids and only known muscles, areas, levels and locations', () => {
    const ids = LOCAL_EXERCISES.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const e of LOCAL_EXERCISES) {
      assert.ok(e.id.startsWith('local-'));
      assert.ok(MUSCLES.includes(e.muscle), `${e.id}: muscle`);
      assert.ok(['beg', 'mid', 'adv'].includes(e.level), `${e.id}: level`);
      assert.ok(e.location.length > 0 && e.location.every((l) => ['gym', 'home'].includes(l)), `${e.id}: location`);
      assert.ok(e.loads.every((a) => INJURY_AREAS.includes(a)), `${e.id}: loads`);
      assert.ok(e.name.length > 0);
    }
  });

  it('exerciseById finds an exercise or returns null', () => {
    assert.equal(exerciseById('local-plank').name, 'פלאנק');
    assert.equal(exerciseById('nope'), null);
  });
});

describe('planWorkout', () => {
  it('every session has at least 3 exercises for a beginner with no injuries, at the gym and at home', () => {
    for (const sessionType of types) {
      for (const location of ['gym', 'home']) {
        const plan = planWorkout({ ...base, level: 'beg', sessionType, location });
        assert.ok(plan.exercises.length >= 3, `${sessionType}/${location}: ${plan.exercises.length}`);
      }
    }
  });

  it('never includes an exercise that loads an injured area', () => {
    for (const area of INJURY_AREAS) {
      for (const sessionType of types) {
        for (const location of ['gym', 'home']) {
          const plan = planWorkout({ ...base, level: 'adv', sessionType, location, injuries: [area] });
          for (const item of plan.exercises) {
            assert.ok(!exerciseById(item.exerciseId).loads.includes(area), `${item.exerciseId} loads ${area}`);
          }
        }
      }
    }
  });

  it('with every area marked it still returns a valid (possibly short) plan', () => {
    const plan = planWorkout({ ...base, sessionType: 'upper', location: 'gym', injuries: INJURY_AREAS });
    assert.ok(Array.isArray(plan.exercises));
    assert.equal(plan.plannedSets, plan.exercises.reduce((s, e) => s + e.sets, 0));
  });

  it('home plans only use home exercises and gym plans only gym exercises', () => {
    for (const location of ['gym', 'home']) {
      const plan = planWorkout({ ...base, level: 'adv', sessionType: 'fullBody', location });
      for (const item of plan.exercises) assert.ok(exerciseById(item.exerciseId).location.includes(location));
    }
  });

  it('respects the level: beginners get no mid/adv exercises and fewer exercises than advanced', () => {
    const beg = planWorkout({ ...base, level: 'beg', sessionType: 'upper', location: 'gym' });
    for (const item of beg.exercises) assert.equal(exerciseById(item.exerciseId).level, 'beg');
    const adv = planWorkout({ ...base, level: 'adv', sessionType: 'upper', location: 'gym' });
    assert.ok(beg.exercises.length <= 4);
    assert.ok(adv.exercises.length > beg.exercises.length);
  });

  it('has no duplicate exercises in one session', () => {
    for (const sessionType of types) {
      const plan = planWorkout({ ...base, level: 'adv', sessionType, location: 'gym' });
      const ids = plan.exercises.map((e) => e.exerciseId);
      assert.equal(new Set(ids).size, ids.length, sessionType);
    }
  });

  it('prescribes sets and reps by goal, capping beginners at 3 sets', () => {
    const mass = planWorkout({ ...base, level: 'adv', sessionType: 'upper', location: 'gym' }).exercises[0];
    assert.deepEqual([mass.sets, mass.repsMin, mass.repsMax], [4, 6, 10]);
    const begMass = planWorkout({ ...base, level: 'beg', sessionType: 'upper', location: 'gym' }).exercises[0];
    assert.equal(begMass.sets, 3);
    const loss = planWorkout({ ...base, goal: 'loss', sessionType: 'upper', location: 'gym' }).exercises[0];
    assert.deepEqual([loss.repsMin, loss.repsMax], [12, 15]);
  });

  it('timed exercises get a hold duration instead of reps', () => {
    const plan = planWorkout({ ...base, level: 'beg', sessionType: 'fullBody', location: 'home' });
    const timed = plan.exercises.filter((e) => e.durationSec);
    for (const t of timed) {
      assert.equal(t.repsMin, undefined);
      assert.equal(t.durationSec, 30);
    }
  });

  it('the second session of the same type in a cycle picks different exercises', () => {
    const a = planWorkout({ ...base, sessionType: 'upper', location: 'gym', variant: 0 });
    const b = planWorkout({ ...base, sessionType: 'upper', location: 'gym', variant: 1 });
    assert.notDeepEqual(a.exercises.map((e) => e.exerciseId), b.exercises.map((e) => e.exerciseId));
  });

  it('is deterministic and rejects unknown session types', () => {
    const args = { ...base, sessionType: 'push', location: 'gym' };
    assert.deepEqual(planWorkout(args), planWorkout(args));
    assert.throws(() => planWorkout({ ...args, sessionType: 'nope' }), RangeError);
  });

  it('plannedSets is the sum of sets', () => {
    const plan = planWorkout({ ...base, sessionType: 'legs', location: 'gym' });
    assert.equal(plan.plannedSets, plan.exercises.reduce((s, e) => s + e.sets, 0));
    assert.ok(plan.plannedSets > 0);
  });
});

describe('nextSession', () => {
  it('starts at the first session and cycles through the split', () => {
    const split = recommendedSplit(4);
    assert.deepEqual(nextSession(split, 0), { index: 0, type: 'upper', variant: 0 });
    assert.deepEqual(nextSession(split, 1), { index: 1, type: 'lower', variant: 0 });
    assert.deepEqual(nextSession(split, 2), { index: 2, type: 'upper', variant: 1 });
    assert.deepEqual(nextSession(split, 4), { index: 0, type: 'upper', variant: 0 });
  });

  it('handles negative or missing counts', () => {
    const split = recommendedSplit(3);
    assert.equal(nextSession(split).index, 0);
    assert.equal(nextSession(split, -1).index, 2);
  });
});
