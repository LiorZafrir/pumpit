// Hebrew labels shared by several screens.
export const SESSION_TITLES = {
  fullBody: 'אימון גוף מלא', upper: 'אימון פלג עליון', lower: 'אימון פלג תחתון',
  push: 'אימון דחיפה', pull: 'אימון משיכה', legs: 'אימון רגליים'
};

export const MUSCLE_LABELS = {
  chest: 'חזה', back: 'גב', shoulders: 'כתפיים', rear: 'כתף אחורית', biceps: 'יד קדמית',
  triceps: 'יד אחורית', quads: 'רגל קדמית', hamstrings: 'רגל אחורית', glutes: 'ישבן', calves: 'תאומים', core: 'בטן'
};

export function formatClock(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDuration(totalSec) {
  const min = Math.round(totalSec / 60);
  if (min < 60) return `${min} דק׳`;
  return `${Math.floor(min / 60)} ש׳ ${String(min % 60).padStart(2, '0')} דק׳`;
}

/** "7.3" for 7 March, local time. */
export function formatShortDate(ms) {
  const d = new Date(ms);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}
