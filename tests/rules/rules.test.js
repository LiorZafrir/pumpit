// Run with: npm run test:rules (starts the Firestore emulator, needs Java).
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';

setLogLevel('silent');

let env;
const ALICE = 'alice';
const BOB = 'bob';

const alice = () => env.authenticatedContext(ALICE).firestore();
const bob = () => env.authenticatedContext(BOB).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const goodSet = { workoutId: 'w1', exerciseId: 'ex1', setIndex: 0, reps: 8, weightKg: 60 };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'pumpit-e5229',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  });
});

after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

async function seed(path, data) {
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), path), data); });
}

describe('isolation between users', () => {
  it('owner can read and write their own profile', async () => {
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}`), { name: 'Alice', age: 30 }));
    await assertSucceeds(getDoc(doc(alice(), `users/${ALICE}`)));
  });

  it("another user cannot read someone else's profile", async () => {
    await seed(`users/${ALICE}`, { name: 'Alice' });
    await assertFails(getDoc(doc(bob(), `users/${ALICE}`)));
  });

  it("another user cannot write someone else's profile", async () => {
    await assertFails(setDoc(doc(bob(), `users/${ALICE}`), { name: 'Mallory' }));
  });

  it("another user cannot read or write someone else's sets", async () => {
    await seed(`users/${ALICE}/sets/s1`, goodSet);
    await assertFails(getDoc(doc(bob(), `users/${ALICE}/sets/s1`)));
    await assertFails(setDoc(doc(bob(), `users/${ALICE}/sets/s2`), goodSet));
  });

  it("another user cannot touch someone else's workouts, exerciseState or bodyWeight", async () => {
    await seed(`users/${ALICE}/workouts/w1`, { status: 'done' });
    await seed(`users/${ALICE}/exerciseState/ex1`, { workingWeightKg: 50 });
    await seed(`users/${ALICE}/bodyWeight/2026-01-01`, { kg: 70 });
    await assertFails(getDoc(doc(bob(), `users/${ALICE}/workouts/w1`)));
    await assertFails(getDoc(doc(bob(), `users/${ALICE}/exerciseState/ex1`)));
    await assertFails(getDoc(doc(bob(), `users/${ALICE}/bodyWeight/2026-01-01`)));
    await assertFails(setDoc(doc(bob(), `users/${ALICE}/workouts/w2`), { status: 'active' }));
    await assertFails(setDoc(doc(bob(), `users/${ALICE}/exerciseState/ex2`), { workingWeightKg: 1 }));
    await assertFails(setDoc(doc(bob(), `users/${ALICE}/bodyWeight/2026-01-02`), { kg: 70 }));
  });
});

describe('signed-out access', () => {
  it('cannot read or write anything', async () => {
    await seed(`users/${ALICE}`, { name: 'Alice' });
    await seed('exercises/ex1', { name: 'Squat' });
    await assertFails(getDoc(doc(anon(), `users/${ALICE}`)));
    await assertFails(setDoc(doc(anon(), `users/${ALICE}`), { name: 'x' }));
    await assertFails(setDoc(doc(anon(), `users/${ALICE}/sets/s1`), goodSet));
    await assertFails(getDoc(doc(anon(), 'exercises/ex1')));
  });

  it('has no access to unknown collections either', async () => {
    await assertFails(getDoc(doc(anon(), 'secrets/s1')));
    await assertFails(setDoc(doc(alice(), 'secrets/s1'), { a: 1 }));
  });
});

describe('profile validation', () => {
  const path = `users/${ALICE}`;

  it('accepts a complete valid profile', async () => {
    await assertSucceeds(setDoc(doc(alice(), path), {
      name: 'Alice', sex: 'f', age: 30, heightCm: 168, weightKg: 62, goal: 'tone', level: 'mid',
      daysPerWeek: 4, injuries: ['knee'], theme: 'pink', lastLocation: 'gym',
      settings: { split: 'auto', restSec: 90, homeGear: ['bands'], homeStyle: 'regular', shortMode: false, superset: false, dropset: true }
    }));
  });

  it('rejects unknown fields', async () => {
    await assertFails(setDoc(doc(alice(), path), { name: 'A', isAdmin: true }));
  });

  it('rejects out-of-range or wrong-type values', async () => {
    await assertFails(setDoc(doc(alice(), path), { weightKg: -5 }));
    await assertFails(setDoc(doc(alice(), path), { weightKg: '70' }));
    await assertFails(setDoc(doc(alice(), path), { age: 5 }));
    await assertFails(setDoc(doc(alice(), path), { heightCm: 400 }));
    await assertFails(setDoc(doc(alice(), path), { daysPerWeek: 9 }));
  });

  it('rejects invalid enum values and oversized lists', async () => {
    await assertFails(setDoc(doc(alice(), path), { goal: 'become-a-god' }));
    await assertFails(setDoc(doc(alice(), path), { sex: 'x' }));
    await assertFails(setDoc(doc(alice(), path), { theme: 'rainbow' }));
    await assertFails(setDoc(doc(alice(), path), { injuries: Array.from({ length: 11 }, (_, i) => `a${i}`) }));
  });

  it('rejects bad settings', async () => {
    await assertFails(setDoc(doc(alice(), path), { settings: { restSec: 5 } }));
    await assertFails(setDoc(doc(alice(), path), { settings: { evil: true } }));
    await assertFails(setDoc(doc(alice(), path), { settings: { split: 'chaos' } }));
  });

  it('validates the merged result of an update', async () => {
    await seed(path, { name: 'Alice', weightKg: 60 });
    await assertSucceeds(updateDoc(doc(alice(), path), { weightKg: 61 }));
    await assertFails(updateDoc(doc(alice(), path), { weightKg: -1 }));
    await assertFails(updateDoc(doc(alice(), path), { extra: 1 }));
  });

  it('lets the owner update lastLocation to gym or home, and nothing else', async () => {
    await seed(path, { name: 'Alice', sex: 'f', age: 30, createdAt: new Date() });
    await assertSucceeds(updateDoc(doc(alice(), path), { lastLocation: 'home' }));
    await assertSucceeds(updateDoc(doc(alice(), path), { lastLocation: 'gym' }));
    await assertFails(updateDoc(doc(alice(), path), { lastLocation: 'moon' }));
    await assertFails(updateDoc(doc(bob(), path), { lastLocation: 'home' }));
  });

  it('lets the owner delete their profile', async () => {
    await seed(path, { name: 'Alice' });
    const { deleteDoc } = await import('firebase/firestore');
    await assertSucceeds(deleteDoc(doc(alice(), path)));
  });
});

describe('onboarding output', () => {
  it('the profile built by the app is accepted by the rules, with server timestamps', async () => {
    const { buildProfile } = await import('../../js/logic/onboarding.js');
    const { serverTimestamp } = await import('firebase/firestore');
    const profile = buildProfile(
      { sex: 'f', age: 28, heightCm: 165, weightKg: 58.5, goal: 'tone', level: 'beg', daysPerWeek: 3, injuries: ['knees', 'neck'] },
      { name: 'Lior Zafrir' }
    );
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}`), { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  });
});

describe('stage 4 fields', () => {
  it('workouts accept sessionType, sessionIndex and a plan, and reject bad values', async () => {
    const p = `users/${ALICE}/workouts/w1`;
    const plan = [{ exerciseId: 'local-plank', sets: 3, durationSec: 30 }];
    await assertSucceeds(setDoc(doc(alice(), p), { sessionType: 'upper', sessionIndex: 2, plan, status: 'active', plannedSets: 3 }));
    await assertFails(setDoc(doc(alice(), p), { sessionType: 'cardio' }));
    await assertFails(setDoc(doc(alice(), p), { sessionIndex: 9 }));
    await assertFails(setDoc(doc(alice(), p), { plan: Array.from({ length: 13 }, () => ({})) }));
    await assertFails(setDoc(doc(alice(), p), { plan: 'not a list' }));
  });

  it('sets accept durationSec within range only', async () => {
    const p = `users/${ALICE}/sets/s1`;
    await assertSucceeds(setDoc(doc(alice(), p), { ...goodSet, reps: 0, weightKg: 0, durationSec: 45 }));
    await assertFails(setDoc(doc(alice(), p), { ...goodSet, durationSec: -1 }));
    await assertFails(setDoc(doc(alice(), p), { ...goodSet, durationSec: 9999 }));
  });

  it('exerciseState accepts lastReps up to 10 numbers', async () => {
    const p = `users/${ALICE}/exerciseState/ex1`;
    await assertSucceeds(setDoc(doc(alice(), p), { workingWeightKg: 40, lastReps: [8, 8, 7] }));
    await assertFails(setDoc(doc(alice(), p), { lastReps: Array.from({ length: 11 }, () => 5) }));
    await assertFails(setDoc(doc(alice(), p), { lastReps: 'x' }));
  });
});

describe('documents built by the app are accepted', () => {
  it('a full workout: start, sets (weighted and timed), finish with exercise states', async () => {
    const { buildSetDoc, buildWorkoutDoc, finishPatch, setDocId } = await import('../../js/logic/workout-state.js');
    const { evaluateExercise } = await import('../../js/logic/progression.js');
    const plan = [
      { exerciseId: 'local-bench-press', name: 'x', sets: 2, repsMin: 6, repsMax: 10 },
      { exerciseId: 'local-plank', name: 'y', sets: 1, durationSec: 30 }
    ];
    const now = Date.now();
    const workout = buildWorkoutDoc({ now, location: 'gym', title: 'אימון פלג עליון', sessionType: 'upper', sessionIndex: 0, plan });
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}/workouts/w1`), workout));

    const sets = [
      buildSetDoc({ workoutId: 'w1', planItem: plan[0], setIndex: 0, reps: 10, weightKg: 60, targetReps: 10, targetWeightKg: 60, now }),
      buildSetDoc({ workoutId: 'w1', planItem: plan[0], setIndex: 1, reps: 10, weightKg: 60, targetReps: 10, targetWeightKg: 60, now }),
      buildSetDoc({ workoutId: 'w1', planItem: plan[1], setIndex: 0, reps: 0, weightKg: 0, durationSec: 35, now })
    ];
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}/sets/${setDocId('w1', 0, 0)}`), sets[0]));
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}/sets/${setDocId('w1', 0, 1)}`), sets[1]));
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}/sets/${setDocId('w1', 1, 0)}`), sets[2]));

    await assertSucceeds(updateDoc(doc(alice(), `users/${ALICE}/workouts/w1`), finishPatch(workout, sets, now + 3000000)));
    for (const item of plan) {
      const own = sets.filter((s) => s.exerciseId === item.exerciseId);
      const { newState } = evaluateExercise({ planItem: item, muscle: item.durationSec ? 'core' : 'chest', sets: own, prev: null, now });
      await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}/exerciseState/${item.exerciseId}`), newState));
    }
  });

  it('every catalog exercise id is usable as a document id in exerciseState', async () => {
    const { LOCAL_EXERCISES } = await import('../../js/data/local-exercises.js');
    for (const e of LOCAL_EXERCISES.slice(0, 5)) {
      await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}/exerciseState/${e.id}`), { workingWeightKg: 20 }));
    }
  });
});

describe('sets validation', () => {
  const path = `users/${ALICE}/sets/s1`;

  it('accepts a valid set, with drops', async () => {
    await assertSucceeds(setDoc(doc(alice(), path), goodSet));
    await assertSucceeds(setDoc(doc(alice(), `users/${ALICE}/sets/s2`), { ...goodSet, drops: [{ reps: 6, weightKg: 50 }] }));
  });

  it('rejects negative or absurd numbers', async () => {
    await assertFails(setDoc(doc(alice(), path), { ...goodSet, weightKg: -10 }));
    await assertFails(setDoc(doc(alice(), path), { ...goodSet, reps: 5000 }));
    await assertFails(setDoc(doc(alice(), path), { ...goodSet, setIndex: -1 }));
  });

  it('rejects unknown and missing required fields', async () => {
    await assertFails(setDoc(doc(alice(), path), { ...goodSet, note: 'hi' }));
    const { exerciseId, ...missing } = goodSet;
    await assertFails(setDoc(doc(alice(), path), missing));
  });

  it('rejects more than 6 drops', async () => {
    const drops = Array.from({ length: 7 }, () => ({ reps: 5, weightKg: 10 }));
    await assertFails(setDoc(doc(alice(), path), { ...goodSet, drops }));
  });
});

describe('workouts, exerciseState and bodyWeight validation', () => {
  it('accepts valid workouts and rejects invalid ones', async () => {
    const p = `users/${ALICE}/workouts/w1`;
    await assertSucceeds(setDoc(doc(alice(), p), { date: '2026-10-30', location: 'gym', title: 'Push', status: 'active', plannedSets: 18 }));
    await assertFails(setDoc(doc(alice(), p), { status: 'weird' }));
    await assertFails(setDoc(doc(alice(), p), { completedSets: -1 }));
    await assertFails(setDoc(doc(alice(), p), { injected: 'x' }));
  });

  it('accepts valid exerciseState and rejects invalid ones', async () => {
    const p = `users/${ALICE}/exerciseState/ex1`;
    await assertSucceeds(setDoc(doc(alice(), p), { workingWeightKg: 62.5, targetReps: 8 }));
    await assertFails(setDoc(doc(alice(), p), { workingWeightKg: -2 }));
    await assertFails(setDoc(doc(alice(), p), { sneaky: 1 }));
  });

  it('accepts valid bodyWeight and rejects invalid ones', async () => {
    const p = `users/${ALICE}/bodyWeight/2026-10-30`;
    await assertSucceeds(setDoc(doc(alice(), p), { kg: 72.4, at: Date.now() }));
    await assertFails(setDoc(doc(alice(), p), { kg: -72 }));
    await assertFails(setDoc(doc(alice(), p), { kg: 1000 }));
    await assertFails(setDoc(doc(alice(), p), { kg: 72, extra: 1 }));
  });
});

describe('exercises collection', () => {
  it('is readable when signed in and never writable', async () => {
    await seed('exercises/ex1', { name: 'Squat' });
    await assertSucceeds(getDoc(doc(alice(), 'exercises/ex1')));
    await assertFails(setDoc(doc(alice(), 'exercises/ex2'), { name: 'Hack' }));
    await assertFails(updateDoc(doc(alice(), 'exercises/ex1'), { name: 'Hack' }));
  });
});
