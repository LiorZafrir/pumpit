// The only module that talks to Firestore. Screens call these functions, never the SDK.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { db } from './firebase.js';

const col = (uid, name) => collection(db, 'users', uid, name);

// ---- profile ----

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

/**
 * Partial profile update. Nested settings use dotted keys ("settings.restSec") so other settings stay as they are.
 * @param {Record<string, unknown>} patch
 */
export function updateProfile(uid, patch) {
  return updateDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() });
}

// ---- workouts ----

/** Newest first. Needs no composite index: it orders by one field and filters in the app. */
export async function getRecentWorkouts(uid, count = 120) {
  const snap = await getDocs(query(col(uid, 'workouts'), orderBy('startedAt', 'desc'), limit(count)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getWorkoutSets(uid, workoutId) {
  const snap = await getDocs(query(col(uid, 'sets'), where('workoutId', '==', workoutId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.at || 0) - (b.at || 0));
}

/** @returns {Promise<Record<string, object>>} exerciseState docs by exerciseId */
export async function getExerciseStates(uid) {
  const snap = await getDocs(col(uid, 'exerciseState'));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
}

/** Creates the workout document. With the offline cache this resolves from the device first. */
export function saveWorkout(uid, workoutId, data) {
  return setDoc(doc(db, 'users', uid, 'workouts', workoutId), data);
}

export function saveSet(uid, setId, data) {
  return setDoc(doc(db, 'users', uid, 'sets', setId), data);
}

/** One atomic write: the workout becomes "done" and every exerciseState is updated. */
export function commitFinish(uid, workoutId, workoutPatch, states) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid, 'workouts', workoutId), workoutPatch);
  for (const [exerciseId, state] of Object.entries(states)) {
    batch.set(doc(db, 'users', uid, 'exerciseState', exerciseId), state);
  }
  return batch.commit();
}

/** Deletes a workout and the sets logged in it. */
export function removeWorkout(uid, workoutId, setIds) {
  const batch = writeBatch(db);
  for (const id of setIds) batch.delete(doc(db, 'users', uid, 'sets', id));
  batch.delete(doc(db, 'users', uid, 'workouts', workoutId));
  return batch.commit();
}

// ---- progress ----

/** Sets logged at or after `sinceMs`, oldest first. One range filter on one field: no composite index needed. */
export async function getSetsSince(uid, sinceMs) {
  const snap = await getDocs(query(col(uid, 'sets'), where('at', '>=', sinceMs), orderBy('at', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Newest first. @returns {Promise<{ id: string, kg: number, at: number }[]>} */
export async function getBodyWeights(uid, count = 400) {
  const snap = await getDocs(query(col(uid, 'bodyWeight'), orderBy('at', 'desc'), limit(count)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** One entry per day (the document id is the date), so logging again the same day replaces it. */
export function saveBodyWeight(uid, dayKey, data) {
  return setDoc(doc(db, 'users', uid, 'bodyWeight', dayKey), data);
}

// ---- account deletion ----

const USER_COLLECTIONS = ['sets', 'workouts', 'exerciseState', 'bodyWeight'];
const BATCH_SIZE = 400;

/** Deletes every document the user owns, the profile last (so a failed attempt can simply be repeated). */
export async function deleteAllUserData(uid) {
  for (const name of USER_COLLECTIONS) {
    const snap = await getDocs(col(uid, name));
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      for (const d of snap.docs.slice(i, i + BATCH_SIZE)) batch.delete(d.ref);
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, 'users', uid));
}
