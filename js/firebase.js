// Firebase init. SDK is pinned to an exact version from the gstatic CDN.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline cache: a set logged in a gym with no signal is saved on the device and synced later.
// If the browser can't persist (e.g. private mode), fall back to the default in-memory cache.
function createDb() {
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }) });
  } catch {
    return getFirestore(app);
  }
}
export const db = createDb();
