import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { formatDuration } from '../ui/labels.js';

const fmt = (n) => String(Math.round(n * 10) / 10);

function nextText(result) {
  const n = result.next;
  if (!n) return '';
  if (n.timed) return `בפעם הבאה: החזק ${n.targetReps} שנ׳ בכל סט`;
  if (n.bodyweight) return 'בפעם הבאה: הוסף חזרות או הקשה על התרגיל';
  if (n.increased) return `בפעם הבאה: הוסף משקל, ${fmt(n.weightKg)} ק״ג`;
  if (n.weightKg > 0) return `בפעם הבאה: אותו משקל, ${fmt(n.weightKg)} ק״ג, יעד ${n.targetReps} חזרות`;
  return `בפעם הבאה: יעד ${n.targetReps} חזרות`;
}

function badge(result) {
  switch (result.outcome) {
    case 'pr': return h('span', { class: 'badge badge-pr' }, icon('trophy', { size: 16 }), 'שיא חדש');
    case 'done': return h('span', { class: 'badge badge-done' }, icon('check', { size: 16 }), 'הושלם');
    case 'partial': return h('span', { class: 'badge badge-partial num' }, `${result.setsDone}/${result.item.sets} סטים`);
    default: return h('span', { class: 'badge badge-partial' }, 'לא בוצע');
  }
}

/** @param {{ summary: object, navigate: (name: string) => void }} ctx */
export function render({ summary, navigate }) {
  const home = h('button', { class: 'btn btn-primary', type: 'button' }, 'חזרה לבית');
  home.addEventListener('click', () => navigate('home'));

  const stat = (label, value) => h('div', { class: 'tile' }, h('span', { class: 'muted small' }, label), h('span', { class: 'tile-value num' }, value));

  return h('section', { class: 'screen summary' },
    h('header', { class: 'ob-head' },
      h('h1', { class: 'ob-title' }, 'האימון הושלם'),
      h('p', { class: 'muted' }, summary.title)),
    h('div', { class: 'tiles four' },
      stat('זמן', formatDuration(summary.durationSec)),
      stat('סטים', `${summary.completedSets}/${summary.plannedSets}`),
      stat('נפח', `${summary.volumeKg.toLocaleString('he-IL')} ק״ג`),
      stat('שיאים', String(summary.prCount))),
    h('div', { class: 'card' },
      h('ul', { class: 'result-list' }, ...summary.results.map((r) =>
        h('li', { class: 'result-row' },
          h('div', { class: 'result-head' }, h('span', { class: 'exercise-name' }, r.name), badge(r)),
          r.outcome === 'skipped' ? null : h('span', { class: 'muted small' }, nextText(r)))))),
    h('div', { class: 'ob-actions' }, home));
}
