// Builds the "download my data" file. Pure.

/** Firestore Timestamps (anything with toDate) become ISO strings; everything else is copied as is. */
export function toPlain(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toPlain(v)]));
  return value;
}

/** @param {{ uid: string, email?: string|null, name?: string|null }} account */
export function buildExport(account, data, now = new Date()) {
  return {
    app: 'PumpIt',
    exportedAt: now.toISOString(),
    note: 'כל המידע שנשמר עליך ב-PumpIt. זמנים מספריים הם אלפיות שנייה מאז 1.1.1970 (UTC).',
    account: { uid: account.uid, email: account.email || null, name: account.name || null },
    ...toPlain(data)
  };
}

export function exportFileName(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `pumpit-data-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}
