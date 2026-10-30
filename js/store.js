// The only module that talks to Firestore. Screens call these functions, never the SDK.
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase.js';

/** @returns {Promise<object|null>} the profile, or null if the user hasn't finished onboarding */
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/** First save after onboarding. Timestamps are set by the server. */
export async function createProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

/** Remembers the last gym/home choice. @param {'gym'|'home'} location */
export async function setLastLocation(uid, location) {
  await updateDoc(doc(db, 'users', uid), { lastLocation: location, updatedAt: serverTimestamp() });
}
