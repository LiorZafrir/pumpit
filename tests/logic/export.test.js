import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildExport, exportFileName, toPlain } from '../../js/logic/export.js';

const ts = (iso) => ({ toDate: () => new Date(iso) });

describe('data export', () => {
  it('turns timestamps into ISO strings, deeply, and keeps other values', () => {
    const out = toPlain({ a: ts('2026-01-02T03:04:05.000Z'), list: [{ b: ts('2026-02-01T00:00:00.000Z'), n: 5 }], s: 'x', z: null });
    assert.deepEqual(out, { a: '2026-01-02T03:04:05.000Z', list: [{ b: '2026-02-01T00:00:00.000Z', n: 5 }], s: 'x', z: null });
  });

  it('wraps the data with the account and time, and is valid JSON', () => {
    const now = new Date('2026-10-31T10:00:00Z');
    const file = buildExport({ uid: 'u1', email: 'a@b.c', name: 'L' }, { profile: { age: 30, createdAt: ts('2026-01-01T00:00:00Z') }, sets: [] }, now);
    assert.equal(file.account.uid, 'u1');
    assert.equal(file.profile.createdAt, '2026-01-01T00:00:00.000Z');
    assert.deepEqual(JSON.parse(JSON.stringify(file)).sets, []);
    assert.match(exportFileName(now), /^pumpit-data-2026-10-31\.json$/);
  });
});
