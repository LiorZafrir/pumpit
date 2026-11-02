import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, REST, applyPatch, detailErrors, detailsPatch, settingsOf } from '../../js/logic/settings.js';

const good = { name: ' דנה ', sex: 'f', age: 30, heightCm: 168.4, weightKg: 61.26, goal: 'tone', level: 'mid', daysPerWeek: 4, injuries: ['knees'] };

test('settingsOf falls back to defaults', () => {
  assert.deepEqual(settingsOf(null), DEFAULT_SETTINGS);
  assert.deepEqual(settingsOf({}), DEFAULT_SETTINGS);
});

test('settingsOf keeps valid values and drops invalid ones', () => {
  const s = settingsOf({ settings: { restSec: 120, homeGear: ['dumbbells', 'rocket'], homeStyle: 'military', superset: true, dropset: 'yes' } });
  assert.deepEqual(s, { restSec: 120, homeGear: ['dumbbells'], homeStyle: 'military', superset: true, dropset: false, warmup: true });
  assert.equal(settingsOf({ settings: { warmup: false } }).warmup, false);
  assert.equal(settingsOf({ settings: { warmup: 'no' } }).warmup, true);
  assert.equal(settingsOf({ settings: { restSec: 5 } }).restSec, REST.min);
  assert.equal(settingsOf({ settings: { restSec: 9999 } }).restSec, REST.max);
  assert.equal(settingsOf({ settings: { homeStyle: 'x' } }).homeStyle, 'regular');
});

test('valid details have no errors', () => {
  assert.deepEqual(detailErrors(good), {});
});

test('each invalid field is reported', () => {
  const errors = detailErrors({ ...good, sex: 'x', age: 12, heightCm: 99, weightKg: 400, goal: 'z', level: 'z', daysPerWeek: 7, injuries: ['wing'] });
  assert.deepEqual(Object.keys(errors).sort(), ['age', 'daysPerWeek', 'goal', 'heightCm', 'injuries', 'level', 'sex', 'weightKg']);
  assert.ok(detailErrors({ ...good, age: 30.5 }).age);
  assert.ok(detailErrors({ ...good, name: 'א'.repeat(61) }).name);
});

test('detailsPatch trims and rounds', () => {
  const p = detailsPatch(good);
  assert.equal(p.name, 'דנה');
  assert.equal(p.heightCm, 168);
  assert.equal(p.weightKg, 61.3);
  assert.notEqual(p.injuries, good.injuries);
});

test('applyPatch handles top-level and nested keys without mutating', () => {
  const profile = { theme: 'lime', settings: { restSec: 90, dropset: true } };
  const next = applyPatch(profile, { theme: 'pink', 'settings.restSec': 120, 'settings.superset': true });
  assert.deepEqual(next, { theme: 'pink', settings: { restSec: 120, dropset: true, superset: true } });
  assert.equal(profile.settings.restSec, 90);
  assert.deepEqual(applyPatch({}, { 'settings.restSec': 60 }), { settings: { restSec: 60 } });
});
