// TEMPORARY local catalog, used until the WorkoutX integration (stage 5).
// Written by us, so it is not WorkoutX data and may live in the app. Firestore only ever stores the id.
//
// loads: injury areas (see INJURY_AREAS) this exercise puts meaningful stress on.
// level: the lowest level it is offered to. The list order is the preference order within a muscle.

const ex = (id, name, muscle, location, loads, level = 'beg', extra = {}) =>
  Object.freeze({ id: `local-${id}`, name, muscle, location, loads, level, ...extra });

const GH = ['gym', 'home'];
const G = ['gym'];
const H = ['home'];

export const MUSCLES = ['chest', 'back', 'shoulders', 'rear', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'];

export const LOCAL_EXERCISES = Object.freeze([
  // chest
  ex('machine-chest-press', 'לחיצת חזה במכונה', 'chest', G, ['shoulders']),
  ex('db-bench-press', 'לחיצת חזה עם משקולות', 'chest', G, ['shoulders', 'wrists']),
  ex('incline-push-up', 'שכיבות סמיכה בשיפוע', 'chest', H, ['wrists']),
  ex('push-up', 'שכיבות סמיכה', 'chest', H, ['wrists', 'shoulders']),
  ex('bench-press', 'לחיצת חזה במוט', 'chest', G, ['shoulders', 'elbows', 'wrists'], 'mid'),
  ex('db-incline-press', 'לחיצת חזה בשיפוע עליון', 'chest', G, ['shoulders', 'wrists'], 'mid'),
  ex('cable-fly', 'פרפר בכבלים', 'chest', G, ['shoulders']),
  ex('decline-push-up', 'שכיבות סמיכה עם רגליים מורמות', 'chest', H, ['wrists', 'shoulders', 'neck'], 'mid'),

  // back
  ex('lat-pulldown', 'משיכת פולי עליון', 'back', G, ['shoulders']),
  ex('seated-row', 'חתירה בכבל בישיבה', 'back', G, []),
  ex('inverted-row', 'חתירה הפוכה מתחת לשולחן יציב', 'back', H, ['elbows']),
  ex('db-row', 'חתירה במשקולת ביד אחת', 'back', G, ['lowerBack']),
  ex('barbell-row', 'חתירה במוט', 'back', G, ['lowerBack', 'wrists'], 'mid'),
  ex('pull-up', 'מתח', 'back', G, ['shoulders', 'elbows', 'wrists'], 'mid'),
  ex('superman', 'סופרמן', 'back', GH, ['lowerBack', 'neck']),

  // shoulders
  ex('machine-shoulder-press', 'לחיצת כתפיים במכונה', 'shoulders', G, ['shoulders']),
  ex('db-shoulder-press', 'לחיצת כתפיים עם משקולות', 'shoulders', G, ['shoulders', 'wrists']),
  ex('lateral-raise', 'הרמות צד', 'shoulders', G, ['shoulders']),
  ex('pike-push-up', 'שכיבות סמיכה בפייק', 'shoulders', H, ['shoulders', 'wrists', 'neck'], 'mid'),

  // rear delts
  ex('face-pull', 'משיכה לפנים בכבל', 'rear', G, []),
  ex('reverse-fly', 'פרפר הפוך עם משקולות', 'rear', G, ['shoulders']),
  ex('reverse-snow-angel', 'מלאך שלג הפוך', 'rear', H, ['neck']),

  // biceps
  ex('cable-curl', 'כפיפת מרפק בכבל', 'biceps', G, ['elbows']),
  ex('db-curl', 'כפיפת מרפק עם משקולות', 'biceps', G, ['elbows', 'wrists']),
  ex('hammer-curl', 'כפיפת פטישים', 'biceps', G, ['elbows']),

  // triceps
  ex('pushdown', 'פשיטת מרפק בפולי', 'triceps', G, ['elbows']),
  ex('overhead-extension', 'פשיטת מרפק מעל הראש', 'triceps', G, ['elbows', 'shoulders']),
  ex('bench-dips', 'מקבילים על כיסא', 'triceps', H, ['shoulders', 'wrists', 'elbows']),
  ex('diamond-push-up', 'שכיבות סמיכה יהלום', 'triceps', H, ['wrists', 'elbows'], 'mid'),

  // quads
  ex('leg-press', 'לחיצת רגליים', 'quads', G, ['knees']),
  ex('goblet-squat', 'סקוואט גביע', 'quads', G, ['knees']),
  ex('bodyweight-squat', 'סקוואט משקל גוף', 'quads', H, ['knees']),
  ex('leg-extension', 'פשיטת ברכיים במכונה', 'quads', G, ['knees']),
  ex('back-squat', 'סקוואט עם מוט', 'quads', G, ['knees', 'lowerBack', 'hips'], 'mid'),
  ex('walking-lunge', 'מכרעים בהליכה', 'quads', GH, ['knees', 'hips'], 'mid'),
  ex('wall-sit', 'ישיבת קיר', 'quads', H, ['knees'], 'beg', { timed: true }),
  ex('bulgarian-split-squat', 'סקוואט בולגרי', 'quads', H, ['knees', 'hips'], 'adv'),

  // hamstrings
  ex('leg-curl', 'כפיפת ברכיים במכונה', 'hamstrings', G, []),
  ex('db-rdl', 'דדליפט רומני עם משקולות', 'hamstrings', G, ['lowerBack']),
  ex('single-leg-rdl', 'דדליפט רגל אחת', 'hamstrings', H, ['lowerBack']),
  ex('barbell-rdl', 'דדליפט רומני עם מוט', 'hamstrings', G, ['lowerBack', 'hips'], 'mid'),

  // glutes
  ex('glute-bridge', 'גשר ישבן', 'glutes', GH, []),
  ex('hip-thrust', 'דחיפת אגן', 'glutes', G, ['hips']),
  ex('cable-kickback', 'בעיטה לאחור בכבל', 'glutes', G, ['hips']),

  // calves
  ex('standing-calf-raise', 'הרמות תאומים בעמידה', 'calves', G, ['ankles']),
  ex('bodyweight-calf-raise', 'הרמות תאומים משקל גוף', 'calves', H, ['ankles']),

  // core
  ex('dead-bug', 'חרק מת', 'core', GH, []),
  ex('plank', 'פלאנק', 'core', GH, ['shoulders', 'wrists'], 'beg', { timed: true }),
  ex('cable-crunch', 'כפיפת בטן בכבל', 'core', G, ['neck']),
  ex('mountain-climbers', 'מטפסי הרים', 'core', H, ['wrists', 'shoulders'], 'mid'),
  ex('hanging-knee-raise', 'הרמת ברכיים בתלייה', 'core', G, ['shoulders', 'wrists'], 'mid')
]);

export function exerciseById(id) {
  return LOCAL_EXERCISES.find((e) => e.id === id) || null;
}
