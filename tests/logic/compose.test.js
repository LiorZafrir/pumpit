import test from 'node:test';
import assert from 'node:assert/strict';
import { composeWorkout } from '../../js/logic/compose.js';
import { exerciseById } from '../../js/data/local-exercises.js';
import { MAX_EXERCISES } from '../../js/logic/shortmode.js';

const profile = { goal: 'mass', level: 'mid', daysPerWeek: 4, injuries: [], settings: {} };
const compose = (opts = {}, extra = {}) => composeWorkout({ profile: { ...profile, ...extra }, workouts: [], location: 'gym', ...opts });
const muscles = (plan) => plan.exercises.map((e) => exerciseById(e.exerciseId)?.muscle ?? e.muscle);

test('without a choice it is the planned session', () => {
  const { next, plan } = compose();
  assert.equal(next.type, 'upper');
  assert.equal(next.index, 0);
  assert.ok(plan.exercises.length >= 4);
  assert.equal(plan.shortMin, null);
  assert.equal(plan.longMin, null);
});

test('a chosen focus is a custom session with its own title and no place in the rotation', () => {
  const { next, plan } = compose({ focus: ['chest', 'back'] });
  assert.equal(next.type, 'custom');
  assert.equal(next.index, undefined);
  assert.equal(next.title, 'אימון חזה וגב');
  assert.ok(muscles(plan).every((m) => ['chest', 'back', 'rear'].includes(m)));
  assert.ok(muscles(plan).includes('chest') && muscles(plan).includes('back'));
});

test('a custom workout does not move the planned rotation', () => {
  const done = (sessionType, sessionIndex, startedAt) => ({ sessionType, sessionIndex, status: 'done', date: '2026-01-01', startedAt, endedAt: startedAt + 1 });
  const history = [done('upper', 0, 1), done('custom', undefined, 2)];
  assert.equal(composeWorkout({ profile, workouts: history, location: 'gym' }).next.index, 1);
  assert.equal(composeWorkout({ profile, workouts: [done('upper', 0, 1)], location: 'gym' }).next.index, 1);
});

test('every chosen area is covered even when there are more areas than the level allows', () => {
  const beginner = { level: 'beg' };
  const { plan } = compose({ focus: ['chest', 'back', 'shoulders', 'arms', 'abs'] }, beginner);
  const m = new Set(muscles(plan));
  for (const wanted of ['chest', 'back', 'shoulders', 'core']) assert.ok(m.has(wanted), wanted);
  assert.ok(m.has('biceps') || m.has('triceps'));
});

test('a short workout fits the time, including the warm-up, and is paired', () => {
  const { plan } = compose({ minutes: 20 });
  assert.equal(plan.shortMin, 20);
  assert.ok(plan.estimateSec <= 20 * 60, String(plan.estimateSec));
  assert.ok(plan.exercises.some((e) => e.pair));
});

test('turning the warm-up off removes it from the time', () => {
  const on = compose({ minutes: 30 });
  const off = compose({ minutes: 30 }, { settings: { warmup: false } });
  assert.ok(off.plan.estimateSec <= on.plan.estimateSec + 300);
  assert.ok(off.plan.exercises.length >= on.plan.exercises.length);
});

test('a long workout has more work than the normal one and stays inside the plan limit', () => {
  const normal = compose();
  for (const minutes of [75, 90]) {
    const long = compose({ minutes });
    assert.equal(long.plan.longMin, minutes);
    assert.ok(long.plan.estimateSec <= minutes * 60, `${minutes}: ${long.plan.estimateSec}`);
    assert.ok(long.plan.plannedSets > normal.plan.plannedSets, `${minutes}: not more sets`);
    assert.ok(long.plan.exercises.length <= MAX_EXERCISES);
    assert.deepEqual(long.plan.exercises.slice(0, normal.plan.exercises.length).map((e) => e.exerciseId), normal.plan.exercises.map((e) => e.exerciseId));
  }
});

test('a long workout for one area still only uses that area', () => {
  const { plan } = compose({ focus: ['arms'], minutes: 75 });
  assert.ok(plan.exercises.length > 0);
  assert.ok(muscles(plan).every((m) => ['biceps', 'triceps'].includes(m)));
});

test('unknown minutes and unknown areas are ignored', () => {
  const plain = compose();
  const odd = compose({ minutes: 33, focus: ['nonsense'] });
  assert.deepEqual(odd.plan.exercises, plain.plan.exercises);
  assert.equal(odd.next.type, plain.next.type);
});

test('injuries and the home location are respected in custom workouts', () => {
  const { plan } = compose({ focus: ['chest'], location: 'home' }, { injuries: ['wrists', 'shoulders'] });
  for (const e of plan.exercises) {
    const ex = exerciseById(e.exerciseId);
    assert.ok(ex.location.includes('home'));
    assert.ok(!ex.loads.some((a) => ['wrists', 'shoulders'].includes(a)), ex.id);
  }
});

test('the superset setting pairs a normal workout too', () => {
  const { plan } = compose({}, { settings: { superset: true } });
  assert.ok(plan.exercises.some((e) => e.pair));
});

test('a 90 minute upper workout fills the time with more exercises, not more sets', () => {
  const normal = compose();
  const long = compose({ minutes: 90 });
  assert.ok(long.plan.exercises.length >= normal.plan.exercises.length + 3, String(long.plan.exercises.length));
  assert.ok(long.plan.estimateSec >= 70 * 60, String(long.plan.estimateSec));
  assert.ok(long.plan.exercises.every((e, i) => i >= normal.plan.exercises.length || e.sets === normal.plan.exercises[i].sets));
  assert.ok(long.plan.exercises.every((e) => e.sets <= 4));
});

test('a long workout with injuries still gets many exercises, with supersets leaving none unpaired', () => {
  const { plan } = compose({ minutes: 90 }, { injuries: ['shoulders', 'wrists'], settings: { superset: true } });
  assert.ok(plan.exercises.length >= 6, String(plan.exercises.length));
  assert.equal(plan.exercises.length % 2, 0);
  assert.ok(plan.exercises.filter((e) => e.pair).length * 2 === plan.exercises.length);
});

test('the estimate is close to the chosen time for 45 minutes and up', () => {
  for (const minutes of [45, 75, 90]) {
    for (const settings of [{}, { superset: true }]) {
      const { plan } = compose({ minutes }, { daysPerWeek: 3, settings });
      const min = plan.estimateSec / 60;
      assert.ok(plan.estimateSec <= minutes * 60, String(min));
      assert.ok(min >= Math.min(minutes - 10, 60), `${minutes}: ${min}`);
    }
  }
});
