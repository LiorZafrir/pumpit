import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_VERSION, consentFields, hasConsent } from '../../js/logic/consent.js';

describe('consent', () => {
  it('requires the current version', () => {
    assert.equal(hasConsent(null), false);
    assert.equal(hasConsent({}), false);
    assert.equal(hasConsent({ consentVersion: '2000-01-01' }), false);
    assert.equal(hasConsent({ consentVersion: CONSENT_VERSION }), true);
  });

  it('records the version and a numeric time that fits the rules', () => {
    const f = consentFields(1234);
    assert.deepEqual(f, { consentVersion: CONSENT_VERSION, consentAt: 1234 });
    assert.ok(CONSENT_VERSION.length > 0 && CONSENT_VERSION.length <= 20);
  });
});
