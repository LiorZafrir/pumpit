import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
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
