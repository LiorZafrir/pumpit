// The 7-day strip on the home screen. Pure. Dates are local (not UTC) so the day matches the user's clock.

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param {Date} [now]
 * @param {{ weekStartsOn?: number, done?: Set<string> }} [opts] weekStartsOn: 0 = Sunday. done: date keys with a finished workout.
 */
export function weekDays(now = new Date(), { weekStartsOn = 0, done = new Set() } = {}) {
  const offset = (now.getDay() - weekStartsOn + 7) % 7;
  const todayKey = toDateKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + i);
    const key = toDateKey(d);
    return {
      key,
      dayOfWeek: d.getDay(),
      dayOfMonth: d.getDate(),
      isToday: key === todayKey,
      isPast: key < todayKey,
      done: done.has(key)
    };
  });
}
