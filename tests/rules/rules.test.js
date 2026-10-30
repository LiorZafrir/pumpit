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

  it('lets the owner delete their profile', async () => {
    await seed(path, { name: 'Alice' });
    const { deleteDoc } = await import('firebase/firestore');
    await assertSucceeds(deleteDoc(doc(alice(), path)));
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
