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

import { nextSessionAfter } from '../../js/logic/planner.js';

describe('nextSessionAfter', () => {
  it('starts at the first session when nothing was finished, then follows the last finished index', () => {
    const split = recommendedSplit(4);
    assert.equal(nextSessionAfter(split, null).index, 0);
    assert.equal(nextSessionAfter(split, undefined).index, 0);
    assert.deepEqual(nextSessionAfter(split, 0), { index: 1, type: 'lower', variant: 0 });
    assert.deepEqual(nextSessionAfter(split, 1), { index: 2, type: 'upper', variant: 1 });
    assert.deepEqual(nextSessionAfter(split, 3), { index: 0, type: 'upper', variant: 0 });
  });

  it('copes with a split that got shorter than the stored index', () => {
    assert.equal(nextSessionAfter(recommendedSplit(2), 5).index, 0);
  });
});

describe('home gear and style', () => {
  const idsOf = (opts) => planWorkout({ ...base, level: 'adv', sessionType: 'fullBody', location: 'home', ...opts }).exercises.map((e) => e.exerciseId);
  const allHomeIds = (opts) => ['fullBody', 'upper', 'lower', 'push', 'pull', 'legs'].flatMap((sessionType) =>
    [0, 1].flatMap((variant) => planWorkout({ ...base, level: 'adv', sessionType, location: 'home', variant, ...opts }).exercises.map((e) => e.exerciseId)));

  it('without gear nothing that needs gear is planned at home', () => {
    for (const id of allHomeIds({})) assert.ok(!(exerciseById(id).gear || []).length, id);
  });

  it('dumbbells and a pull-up bar unlock their exercises', () => {
    const ids = allHomeIds({ gear: ['dumbbells', 'pullupBar'] });
    assert.ok(ids.some((id) => (exerciseById(id).gear || []).includes('dumbbells')));
    assert.ok(ids.includes('local-pull-up'));
    const withBarOnly = allHomeIds({ gear: ['pullupBar'] });
    assert.ok(withBarOnly.every((id) => !(exerciseById(id).gear || []).includes('dumbbells')));
  });

  it('calisthenics and military never use dumbbells even when owned', () => {
    for (const style of ['calisthenics', 'military']) {
      for (const id of allHomeIds({ gear: ['dumbbells', 'pullupBar'], style })) assert.ok(!(exerciseById(id).gear || []).includes('dumbbells'), `${style}: ${id}`);
    }
  });

  it('kettlebell, bands and a step each unlock their own exercises and nothing else', () => {
    for (const g of ['kettlebell', 'bands', 'step']) {
      const ids = allHomeIds({ gear: [g] });
      assert.ok(ids.some((id) => (exerciseById(id).gear || []).includes(g)), g);
      assert.ok(ids.every((id) => (exerciseById(id).gear || []).every((x) => x === g)), g);
    }
  });

  it('calisthenics and military leave out the kettlebell too, but keep bands and the step', () => {
    for (const style of ['calisthenics', 'military']) {
      const ids = allHomeIds({ gear: ['kettlebell', 'bands', 'step'], style });
      assert.ok(ids.every((id) => !(exerciseById(id).gear || []).includes('kettlebell')), style);
    }
  });

  it('military style prefers its favourite exercises', () => {
    const ids = idsOf({ style: 'military', gear: ['pullupBar'] });
    assert.ok(ids.every((id) => !['local-incline-push-up', 'local-inverted-row'].includes(id) || exerciseById(id).mil));
    assert.ok(ids.includes('local-push-up'));
  });

  it('gear and style do not change gym plans', () => {
    const gym = (opts) => planWorkout({ ...base, level: 'adv', sessionType: 'upper', location: 'gym', ...opts });
    assert.deepEqual(gym({}), gym({ gear: ['dumbbells'], style: 'military' }));
  });
});
