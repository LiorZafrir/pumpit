// Onboarding rules: step validation and building the Firestore profile. Pure.
export const STEP_COUNT = 6;

// Same ranges as firestore.rules, so a value that passes here is accepted by the server.
export const RANGES = {
  age: { min: 13, max: 100 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 350 }
};

export const GOALS = ['tone', 'loss', 'mass', 'fit'];
export const LEVELS = ['beg', 'mid', 'adv'];
export const SEXES = ['m', 'f'];
export const INJURY_AREAS = ['neck', 'shoulders', 'elbows', 'wrists', 'lowerBack', 'hips', 'knees', 'ankles'];

export function emptyAnswers() {
  return { sex: null, age: null, heightCm: null, weightKg: null, goal: null, level: null, daysPerWeek: 3, injuries: [] };
}

export function inRange(key, value) {
  const r = RANGES[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= r.min && value <= r.max;
}

/** Whether the "continue" button may be enabled on this (0-based) step. */
export function stepIsValid(step, a) {
  switch (step) {
    case 0: return SEXES.includes(a.sex) && Number.isInteger(a.age) && inRange('age', a.age);
    case 1: return inRange('heightCm', a.heightCm) && inRange('weightKg', a.weightKg);
    case 2: return GOALS.includes(a.goal);
    case 3: return LEVELS.includes(a.level);
    case 4: return Number.isInteger(a.daysPerWeek) && a.daysPerWeek >= 2 && a.daysPerWeek <= 6;
    case 5: return a.injuries.every((i) => INJURY_AREAS.includes(i));
    default: return false;
  }
}

export function defaultThemeFor(sex) {
  return sex === 'f' ? 'pink' : 'lime';
}

export function isProfileComplete(profile) {
  if (!profile) return false;
  return SEXES.includes(profile.sex)
    && inRange('age', profile.age)
    && inRange('heightCm', profile.heightCm)
    && inRange('weightKg', profile.weightKg)
    && GOALS.includes(profile.goal)
    && LEVELS.includes(profile.level)
    && Number.isInteger(profile.daysPerWeek);
}

/** Profile document for users/{uid}, containing only fields the rules allow. */
export function buildProfile(a, { name } = {}) {
  const profile = {
    sex: a.sex,
    age: a.age,
    heightCm: Math.round(a.heightCm),
    weightKg: Math.round(a.weightKg * 10) / 10,
    goal: a.goal,
    level: a.level,
    daysPerWeek: a.daysPerWeek,
    injuries: [...a.injuries],
    theme: defaultThemeFor(a.sex)
  };
  const trimmed = typeof name === 'string' ? name.trim().slice(0, 60) : '';
  if (trimmed) profile.name = trimmed;
  return profile;
}
