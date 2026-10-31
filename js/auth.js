import {
  GoogleAuthProvider,
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from './firebase.js';

const provider = new GoogleAuthProvider();

// iOS home-screen apps can't use popups, so they use the redirect flow.
function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

const MESSAGES = {
  'auth/popup-closed-by-user': 'ההתחברות בוטלה. אפשר לנסות שוב.',
  'auth/cancelled-popup-request': 'ההתחברות בוטלה. אפשר לנסות שוב.',
  'auth/popup-blocked': 'הדפדפן חסם את חלון ההתחברות. אפשר לאשר חלונות קופצים ולנסות שוב.',
  'auth/network-request-failed': 'אין חיבור לאינטרנט. בדוק את הרשת ונסה שוב.',
  'auth/unauthorized-domain': 'הדומיין הזה לא מורשה להתחברות. צריך להוסיף אותו ל-Authorized domains ב-Firebase.'
};

export function describeAuthError(err) {
  return MESSAGES[err && err.code] || 'ההתחברות נכשלה. נסה שוב בעוד רגע.';
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Returns an error when a redirect sign-in came back with a failure, otherwise null.
export async function finishRedirect() {
  try {
    await getRedirectResult(auth);
    return null;
  } catch (err) {
    return err;
  }
}

export async function signInWithGoogle() {
  if (isStandalone()) {
    await signInWithRedirect(auth, provider);
    return;
  }
  await signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

// ---- account deletion ----
// Deleting an account needs a recent sign-in, so Google asks the user to confirm first. In an iOS home-screen
// app that is a redirect, which leaves the page: a short-lived flag tells the app to finish the deletion on return.

const PENDING_KEY = 'pumpit.deletePending';
const PENDING_MAX_MS = 15 * 60 * 1000;

/** @returns {Promise<'done'|'redirect'>} 'redirect' means the page is leaving for Google and will come back. */
export async function reauthenticate() {
  const user = auth.currentUser;
  if (!user) throw new Error('not signed in');
  if (isStandalone()) {
    try { localStorage.setItem(PENDING_KEY, String(Date.now())); } catch { /* the user can just try again */ }
    await reauthenticateWithRedirect(user, provider);
    return 'redirect';
  }
  await reauthenticateWithPopup(user, provider);
  return 'done';
}

/** True once if a deletion was waiting for the redirect to come back. */
export function consumeDeletePending() {
  try {
    const at = Number(localStorage.getItem(PENDING_KEY));
    localStorage.removeItem(PENDING_KEY);
    return Number.isFinite(at) && at > 0 && Date.now() - at < PENDING_MAX_MS;
  } catch {
    return false;
  }
}

export function clearDeletePending() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
}

export function deleteCurrentUser() {
  return deleteUser(auth.currentUser);
}
