// Which version of the privacy policy and terms the user accepted. Pure.
// Bump CONSENT_VERSION (and the date in legal.html) after a material change: everyone is asked to accept again.
export const CONSENT_VERSION = '2026-10-31';
export const LEGAL_URL = './legal.html';

export function hasConsent(profile) {
  return Boolean(profile) && profile.consentVersion === CONSENT_VERSION;
}

/** Profile fields recording the acceptance. A number (ms), so it can be written offline and passes the rules. */
export function consentFields(now = Date.now()) {
  return { consentVersion: CONSENT_VERSION, consentAt: now };
}
