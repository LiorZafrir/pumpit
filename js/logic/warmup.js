// The warm-up before a workout, and the light "first set" hint. Pure.
import { WARMUP_MOVES } from '../data/warmups.js';
import { regionOf } from './progression.js';

const PER_AREA = 2; // moves per body area
const PAUSE_SEC = 5; // time to change position between moves

/**
 * The moves for a workout: a general one, two for each body half that is trained, and one for the core
 * when the core or both halves are worked. `muscles` are catalog muscles of the workout's exercises.
 */
export function buildWarmup(muscles, moves = WARMUP_MOVES) {
  const areas = new Set(muscles.map((m) => (m === 'core' ? 'core' : regionOf(m))));
  const pick = (area, count) => moves.filter((m) => m.area === area).slice(0, count);
  const out = [...pick('general', 1)];
  if (areas.has('upper')) out.push(...pick('upper', PER_AREA));
  if (areas.has('lower')) out.push(...pick('lower', PER_AREA));
  if (areas.has('core') || (areas.has('upper') && areas.has('lower'))) out.push(...pick('core', 1));
  return out;
}

/** How long the warm-up takes, with the short pauses between moves. 0 for no moves. */
export function warmupSeconds(moves) {
  return moves.reduce((sum, m) => sum + m.sec + PAUSE_SEC, 0);
}

const WARMUP_SET_SHARE = 0.5;
const MIN_WARMUP_SET_KG = 5;
const WEIGHT_STEP = 2.5;

/**
 * The weight for a light first set: half the working weight, to the nearest 2.5 kg.
 * Null when the working weight is too small for a warm-up set to mean anything.
 */
export function warmupSetWeight(workingKg) {
  if (!Number.isFinite(workingKg) || workingKg < 2 * MIN_WARMUP_SET_KG) return null;
  return Math.max(MIN_WARMUP_SET_KG, Math.round((workingKg * WARMUP_SET_SHARE) / WEIGHT_STEP) * WEIGHT_STEP);
}
