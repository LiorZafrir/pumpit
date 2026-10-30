import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toDateKey, weekDays } from '../../js/logic/week.js';

describe('weekDays', () => {
  it('returns 7 consecutive days starting on Sunday', () => {
    const days = weekDays(new Date(2026, 9, 29)); // Thursday 29 Oct 2026
    assert.equal(days.length, 7);
    assert.deepEqual(days.map((d) => d.dayOfWeek), [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(days[0].key, '2026-10-25');
    assert.equal(days[6].key, '2026-10-31');
  });

  it('marks only today, and past days before it', () => {
    const days = weekDays(new Date(2026, 9, 29));
    assert.deepEqual(days.filter((d) => d.isToday).map((d) => d.key), ['2026-10-29']);
    assert.deepEqual(days.filter((d) => d.isPast).map((d) => d.key), ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28']);
  });

  it('on a Sunday the week starts today; on a Saturday it ends today', () => {
    assert.equal(weekDays(new Date(2026, 9, 25))[0].isToday, true);
    assert.equal(weekDays(new Date(2026, 9, 31))[6].isToday, true);
  });

  it('crosses month and year boundaries', () => {
    const days = weekDays(new Date(2027, 0, 1)); // Friday
    assert.equal(days[0].key, '2026-12-27');
    assert.equal(days[6].key, '2027-01-02');
  });

  it('is not shifted by the time of day', () => {
    assert.equal(weekDays(new Date(2026, 9, 29, 23, 59))[4].isToday, true);
    assert.equal(weekDays(new Date(2026, 9, 29, 0, 1))[4].isToday, true);
  });

  it('supports a Monday start and flags completed days', () => {
    const days = weekDays(new Date(2026, 9, 29), { weekStartsOn: 1, done: new Set(['2026-10-27']) });
    assert.equal(days[0].key, '2026-10-26');
    assert.deepEqual(days.filter((d) => d.done).map((d) => d.key), ['2026-10-27']);
  });
});

describe('toDateKey', () => {
  it('zero-pads month and day', () => {
    assert.equal(toDateKey(new Date(2026, 0, 5)), '2026-01-05');
  });
});
