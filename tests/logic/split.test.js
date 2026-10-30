import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recommendedSplit } from '../../js/logic/split.js';

describe('recommendedSplit', () => {
  it('2 and 3 days are full body', () => {
    for (const d of [2, 3]) {
      const s = recommendedSplit(d);
      assert.equal(s.type, 'fullBody');
      assert.equal(s.sessions.length, d);
    }
  });

  it('4 days alternate upper and lower', () => {
    assert.deepEqual(recommendedSplit(4).sessions, ['upper', 'lower', 'upper', 'lower']);
    assert.equal(recommendedSplit(4).type, 'upperLower');
  });

  it('5 and 6 days are push / pull / legs', () => {
    assert.deepEqual(recommendedSplit(5).sessions, ['push', 'pull', 'legs', 'push', 'pull']);
    assert.deepEqual(recommendedSplit(6).sessions, ['push', 'pull', 'legs', 'push', 'pull', 'legs']);
    assert.equal(recommendedSplit(6).type, 'pushPullLegs');
  });

  it('rejects days outside 2..6 or non-integers', () => {
    for (const d of [1, 7, 0, -1, 2.5, NaN, '3', null]) {
      assert.throws(() => recommendedSplit(d), RangeError);
    }
  });
});
