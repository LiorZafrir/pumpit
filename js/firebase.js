// Firebase init. SDK is pinned to an exact version from the gstatic CDN.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js';
import { appCheckSiteKey, firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// App Check proves that requests come from this app, not from someone using our public config from elsewhere.
// Off until a site key is set. On localhost it uses a debug token (printed in the console; register it in the Firebase console).
// A failure here must never stop the app, so it is swallowed: the server decides, once enforcement is on.
function startAppCheck() {
  if (!appCheckSiteKey) return;
  try {
    if (['localhost', '127.0.0.1'].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  } catch (err) {
    console.warn('App Check did not start', err);
  }
}
startAppCheck();

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
