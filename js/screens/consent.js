// Shown before onboarding (new users) or once after the documents change (existing users).
import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { LEGAL_URL } from '../logic/consent.js';

const link = (hash, text) => h('a', { class: 'inline-link', href: `${LEGAL_URL}#${hash}` }, text);

/** @param {{ profile: object|null, onConsent: () => Promise<void>|void }} ctx */
export function render({ profile, onConsent }) {
  const updated = Boolean(profile && profile.consentVersion);
  const box = h('input', { type: 'checkbox', id: 'consent-box', class: 'check-input' });
  const button = h('button', { class: 'btn btn-primary', type: 'button', disabled: true }, 'מאשר וממשיך');
  const errorSlot = h('div', { role: 'alert' });

  box.addEventListener('change', () => { button.disabled = !box.checked; });
  button.addEventListener('click', async () => {
    if (!box.checked) return;
    button.disabled = true;
    errorSlot.replaceChildren();
    try {
      await onConsent();
    } catch {
      button.disabled = false;
      errorSlot.replaceChildren(h('div', { class: 'error-msg' }, icon('alert', { size: 20 }), h('span', null, 'השמירה נכשלה. בדוק את החיבור ונסה שוב.')));
    }
  });

  return h('section', { class: 'screen consent' },
    h('header', { class: 'ob-head' },
      h('h1', { class: 'ob-title' }, updated ? 'עדכנו את המסמכים' : 'לפני שמתחילים'),
      h('p', { class: 'muted' }, updated
        ? 'מדיניות הפרטיות ותנאי השימוש עודכנו. כדי להמשיך צריך לאשר אותם שוב.'
        : 'כמה דברים חשובים על הבריאות ועל הנתונים שלך.')),

    h('div', { class: 'card consent-card' },
      h('div', { class: 'consent-head' }, icon('alert', { size: 22 }), h('h2', null, 'זה לא ייעוץ רפואי')),
      h('ul', { class: 'consent-list' },
        h('li', null, 'מומלץ להתייעץ עם רופא לפני תחילת תוכנית אימונים, במיוחד אם יש לך מחלה, פציעה או הריון.'),
        h('li', null, 'אם מופיעים כאב, סחרחורת או לחץ בחזה, יש להפסיק מיד.'),
        h('li', null, 'המשקלים והתרגילים המוצעים הם הצעה כללית. בחירת המשקל והביצוע באחריותך.'))),

    h('div', { class: 'card consent-card' },
      h('div', { class: 'consent-head' }, icon('user', { size: 22 }), h('h2', null, 'מה נשמר עליך')),
      h('ul', { class: 'consent-list' },
        h('li', null, 'שם ואימייל מ-Google, וגם גיל, גובה, משקל, מטרה ואזורים רגישים (רשות) שתמסור.'),
        h('li', null, 'האימונים והמשקלים שתרשום. הכול נשמר ב-Firebase של Google, בשרתים בישראל.'),
        h('li', null, 'בלי פרסומות, בלי מעקב, בלי מכירת מידע. אפשר להוריד או למחוק הכול בכל רגע מהפרופיל.'))),

    h('label', { class: 'consent-check', for: 'consent-box' }, box,
      h('span', null, 'קראתי ואני מסכים ל', link('terms', 'תנאי השימוש'), ' ול', link('privacy', 'מדיניות הפרטיות'),
        ', כולל שמירת הנתונים הגופניים שלי. אם אני מתחת לגיל 18, הורה שלי מסכים לשימוש.')),

    h('div', { class: 'ob-actions' }, errorSlot, button),
    h('p', { class: 'muted small consent-foot' }, link('accessibility', 'הצהרת נגישות')));
}
