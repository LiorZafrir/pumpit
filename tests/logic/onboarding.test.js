import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProfile, defaultThemeFor, emptyAnswers, inRange, isProfileComplete, stepIsValid
} from '../../js/logic/onboarding.js';

const full = () => ({
  sex: 'f', age: 30, heightCm: 168, weightKg: 62.46, goal: 'tone', level: 'mid', daysPerWeek: 4, injuries: ['knees']
});

describe('stepIsValid', () => {
  it('blocks every required step on empty answers except days and injuries (which have defaults)', () => {
    const a = emptyAnswers();
    assert.equal(stepIsValid(0, a), false);
    assert.equal(stepIsValid(1, a), false);
    assert.equal(stepIsValid(2, a), false);
    assert.equal(stepIsValid(3, a), false);
    assert.equal(stepIsValid(4, a), true);
    assert.equal(stepIsValid(5, a), true);
  });

  it('step 0 needs a sex and an integer age in range', () => {
    assert.equal(stepIsValid(0, { ...emptyAnswers(), sex: 'm', age: 25 }), true);
    assert.equal(stepIsValid(0, { ...emptyAnswers(), sex: 'm', age: 12 }), false);
    assert.equal(stepIsValid(0, { ...emptyAnswers(), sex: 'm', age: 25.5 }), false);
    assert.equal(stepIsValid(0, { ...emptyAnswers(), sex: 'x', age: 25 }), false);
  });

  it('step 1 needs height and weight in range', () => {
    assert.equal(stepIsValid(1, { ...emptyAnswers(), heightCm: 180, weightKg: 80 }), true);
    assert.equal(stepIsValid(1, { ...emptyAnswers(), heightCm: 99, weightKg: 80 }), false);
    assert.equal(stepIsValid(1, { ...emptyAnswers(), heightCm: 180, weightKg: -5 }), false);
    assert.equal(stepIsValid(1, { ...emptyAnswers(), heightCm: 180, weightKg: NaN }), false);
  });

  it('goal and level must be known values', () => {
    assert.equal(stepIsValid(2, { ...emptyAnswers(), goal: 'mass' }), true);
    assert.equal(stepIsValid(2, { ...emptyAnswers(), goal: 'nope' }), false);
    assert.equal(stepIsValid(3, { ...emptyAnswers(), level: 'adv' }), true);
    assert.equal(stepIsValid(3, { ...emptyAnswers(), level: null }), false);
  });

  it('injuries must be known areas', () => {
    assert.equal(stepIsValid(5, { ...emptyAnswers(), injuries: ['hips', 'neck'] }), true);
    assert.equal(stepIsValid(5, { ...emptyAnswers(), injuries: ['toe'] }), false);
  });
});

describe('inRange', () => {
  it('matches the firestore.rules bounds inclusively', () => {
    assert.equal(inRange('age', 13), true);
    assert.equal(inRange('age', 100), true);
    assert.equal(inRange('age', 101), false);
    assert.equal(inRange('heightCm', 250), true);
    assert.equal(inRange('weightKg', 25), true);
    assert.equal(inRange('weightKg', 350.1), false);
    assert.equal(inRange('weightKg', '70'), false);
  });
});

describe('theme and completeness', () => {
  it('women default to pink, men to lime', () => {
    assert.equal(defaultThemeFor('f'), 'pink');
    assert.equal(defaultThemeFor('m'), 'lime');
  });

  it('isProfileComplete requires every onboarding field', () => {
    const p = buildProfile(full(), { name: 'A' });
    assert.equal(isProfileComplete(p), true);
    assert.equal(isProfileComplete(null), false);
    assert.equal(isProfileComplete({ ...p, goal: undefined }), false);
    assert.equal(isProfileComplete({ name: 'only a name' }), false);
  });
});

describe('buildProfile', () => {
  it('produces only fields allowed by the Firestore rules', () => {
    const allowed = ['name', 'sex', 'age', 'heightCm', 'weightKg', 'goal', 'level', 'daysPerWeek',
      'injuries', 'theme', 'lastLocation', 'settings', 'createdAt', 'updatedAt'];
    const p = buildProfile(full(), { name: 'Lior Zafrir' });
    for (const k of Object.keys(p)) assert.ok(allowed.includes(k), `unexpected field ${k}`);
  });

  it('rounds weight to one decimal, height to an integer, and picks the theme', () => {
    const p = buildProfile(full(), { name: 'x' });
    assert.equal(p.weightKg, 62.5);
    assert.equal(p.heightCm, 168);
    assert.equal(p.theme, 'pink');
  });

  it('omits an empty name, trims and caps a long one, and copies injuries', () => {
    assert.equal('name' in buildProfile(full(), { name: '   ' }), false);
    assert.equal('name' in buildProfile(full(), {}), false);
    assert.equal(buildProfile(full(), { name: ' ' + 'a'.repeat(100) }).name.length, 60);
    const a = full();
    const p = buildProfile(a, { name: 'x' });
    p.injuries.push('hips');
    assert.deepEqual(a.injuries, ['knees']);
  });
});
