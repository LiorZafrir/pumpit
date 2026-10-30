// Sound, vibration and screen wake lock. Each is used only where the browser supports it
// (feature detection, never a device check): iPhone has no vibration, Android has all three.

let audioCtx = null;
let wakeLock = null;
let wantAwake = false;

/** Call from a tap handler: browsers only allow audio after a user gesture. */
export function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {
    // audio is optional
  }
}

/** A short run of beeps, used when a rest ends. */
export function beep(times = 3) {
  try {
    if (!audioCtx) return;
    const start = audioCtx.currentTime + 0.02;
    for (let i = 0; i < times; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === times - 1 ? 1175 : 880;
      const t = start + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  } catch {
    // audio is optional
  }
}

export function vibrate(pattern = [200, 100, 200]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // vibration is optional
  }
}

async function acquire() {
  try {
    if (!('wakeLock' in navigator) || wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantAwake) acquire();
});

/** Keep the screen on during a workout. */
export function keepAwake() {
  wantAwake = true;
  return acquire();
}

export function releaseAwake() {
  wantAwake = false;
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
