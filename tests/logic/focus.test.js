import test from 'node:test';
import assert from 'node:assert/strict';
import { FOCUS_OPTIONS, focusTitle, normalizeFocus, slotsForFocus } from '../../js/logic/focus.js';
import { MUSCLES } from '../../js/data/local-exercises.js';
import { planWorkout } from '../../js/logic/planner.js';

test('normalizeFocus keeps known areas once, in a fixed order', () => {
  assert.deepEqual(normalizeFocus(['back', 'chest', 'back', 'nonsense']), ['chest', 'back']);
  assert.deepEqual(normalizeFocus(null), []);
  assert.deepEqual(normalizeFocus([]), []);
});

test('no choice means the planned session is used', () => {
  assert.equal(slotsForFocus([]), null);
});

test('every area only asks for muscles that exist in the catalog', () => {
  for (const area of FOCUS_OPTIONS) for (const muscle of slotsForFocus([area])) assert.ok(MUSCLES.includes(muscle), `${area}: ${muscle}`);
});

test('a combination takes one slot from each area in turn', () => {
  assert.deepEqual(slotsForFocus(['chest', 'back']).slice(0, 4), ['chest', 'back', 'chest', 'back']);
  assert.deepEqual(slotsForFocus(['arms']).slice(0, 2), ['biceps', 'triceps']);
  const five = slotsForFocus(['chest', 'back', 'shoulders', 'arms', 'abs']);
  assert.deepEqual(five.slice(0, 5), ['chest', 'back', 'shoulders', 'biceps', 'core']);
});

test('titles read naturally in Hebrew', () => {
  assert.equal(focusTitle([]), '');
  assert.equal(focusTitle(['chest']), 'אימון חזה');
  assert.equal(focusTitle(['back', 'chest']), 'אימון חזה וגב');
  assert.equal(focusTitle(['chest', 'back', 'shoulders']), 'אימון חזה, גב וכתפיים');
  assert.equal(focusTitle(['upper']), 'אימון פלג עליון');
});

test('every single area gives a gym workout of at least 3 exercises for a beginner', () => {
  for (const area of FOCUS_OPTIONS) {
    const { exercises } = planWorkout({ sessionType: 'custom', slots: slotsForFocus([area]), location: 'gym', goal: 'fit', level: 'beg' });
    assert.ok(exercises.length >= 3, `${area}: ${exercises.length}`);
  }
});

test('a chosen area only gets exercises for its own muscles', () => {
  const { exercises } = planWorkout({ sessionType: 'custom', slots: slotsForFocus(['arms']), location: 'gym', goal: 'fit', level: 'mid' });
  assert.ok(exercises.length > 0);
  assert.ok(exercises.every((e) => ['biceps', 'triceps'].includes(e.muscle)));
});
