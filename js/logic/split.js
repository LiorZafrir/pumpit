// Recommended weekly split by training days. Pure: no DOM, no Firebase.
export const MIN_DAYS = 2;
export const MAX_DAYS = 6;

/** @param {number} days training days per week, 2..6 */
export function recommendedSplit(days) {
  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
    throw new RangeError(`days must be an integer from ${MIN_DAYS} to ${MAX_DAYS}`);
  }
  if (days <= 3) return { type: 'fullBody', days, sessions: Array(days).fill('fullBody') };
  if (days === 4) return { type: 'upperLower', days, sessions: ['upper', 'lower', 'upper', 'lower'] };
  const cycle = ['push', 'pull', 'legs'];
  return { type: 'pushPullLegs', days, sessions: Array.from({ length: days }, (_, i) => cycle[i % 3]) };
}
