// TEMPORARY local catalog, used until the WorkoutX integration (stage 5).
// Written by us, so it is not WorkoutX data and may live in the app. Firestore only ever stores the id.
//
// loads: injury areas (see INJURY_AREAS) this exercise puts meaningful stress on.
// level: the lowest level it is offered to. The list order is the preference order within a muscle.
// gear: equipment needed at home ('dumbbells', 'pullupBar'). mil: favoured by the military style at home.

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
  ex('push-up', 'שכיבות סמיכה', 'chest', H, ['wrists', 'shoulders'], 'beg', { mil: true }),
  ex('bench-press', 'לחיצת חזה במוט', 'chest', G, ['shoulders', 'elbows', 'wrists'], 'mid'),
  ex('db-incline-press', 'לחיצת חזה בשיפוע עליון', 'chest', G, ['shoulders', 'wrists'], 'mid'),
  ex('cable-fly', 'פרפר בכבלים', 'chest', G, ['shoulders']),
  ex('decline-push-up', 'שכיבות סמיכה עם רגליים מורמות', 'chest', H, ['wrists', 'shoulders', 'neck'], 'mid', { mil: true }),

  // back
  ex('lat-pulldown', 'משיכת פולי עליון', 'back', G, ['shoulders']),
  ex('seated-row', 'חתירה בכבל בישיבה', 'back', G, []),
  ex('inverted-row', 'חתירה הפוכה מתחת לשולחן יציב', 'back', H, ['elbows']),
  ex('db-row', 'חתירה במשקולת ביד אחת', 'back', GH, ['lowerBack'], 'beg', { gear: ['dumbbells'] }),
  ex('barbell-row', 'חתירה במוט', 'back', G, ['lowerBack', 'wrists'], 'mid'),
  ex('pull-up', 'מתח', 'back', GH, ['shoulders', 'elbows', 'wrists'], 'mid', { gear: ['pullupBar'], mil: true }),
  ex('superman', 'סופרמן', 'back', GH, ['lowerBack', 'neck']),

  // shoulders
  ex('machine-shoulder-press', 'לחיצת כתפיים במכונה', 'shoulders', G, ['shoulders']),
  ex('db-shoulder-press', 'לחיצת כתפיים עם משקולות', 'shoulders', GH, ['shoulders', 'wrists'], 'beg', { gear: ['dumbbells'] }),
  ex('lateral-raise', 'הרמות צד', 'shoulders', GH, ['shoulders'], 'beg', { gear: ['dumbbells'] }),
  ex('pike-push-up', 'שכיבות סמיכה בפייק', 'shoulders', H, ['shoulders', 'wrists', 'neck'], 'mid'),

  // rear delts
  ex('face-pull', 'משיכה לפנים בכבל', 'rear', G, []),
  ex('reverse-fly', 'פרפר הפוך עם משקולות', 'rear', GH, ['shoulders'], 'beg', { gear: ['dumbbells'] }),
  ex('reverse-snow-angel', 'מלאך שלג הפוך', 'rear', H, ['neck']),

  // biceps
  ex('cable-curl', 'כפיפת מרפק בכבל', 'biceps', G, ['elbows']),
  ex('db-curl', 'כפיפת מרפק עם משקולות', 'biceps', GH, ['elbows', 'wrists'], 'beg', { gear: ['dumbbells'] }),
  ex('hammer-curl', 'כפיפת פטישים', 'biceps', GH, ['elbows'], 'beg', { gear: ['dumbbells'] }),

  // triceps
  ex('pushdown', 'פשיטת מרפק בפולי', 'triceps', G, ['elbows']),
  ex('overhead-extension', 'פשיטת מרפק מעל הראש', 'triceps', GH, ['elbows', 'shoulders'], 'beg', { gear: ['dumbbells'] }),
  ex('bench-dips', 'מקבילים על כיסא', 'triceps', H, ['shoulders', 'wrists', 'elbows']),
  ex('diamond-push-up', 'שכיבות סמיכה יהלום', 'triceps', H, ['wrists', 'elbows'], 'mid', { mil: true }),

  // quads
  ex('leg-press', 'לחיצת רגליים', 'quads', G, ['knees']),
  ex('goblet-squat', 'סקוואט גביע', 'quads', GH, ['knees'], 'beg', { gear: ['dumbbells'] }),
  ex('bodyweight-squat', 'סקוואט משקל גוף', 'quads', H, ['knees'], 'beg', { mil: true }),
  ex('leg-extension', 'פשיטת ברכיים במכונה', 'quads', G, ['knees']),
  ex('back-squat', 'סקוואט עם מוט', 'quads', G, ['knees', 'lowerBack', 'hips'], 'mid'),
  ex('walking-lunge', 'מכרעים בהליכה', 'quads', GH, ['knees', 'hips'], 'mid', { mil: true }),
  ex('wall-sit', 'ישיבת קיר', 'quads', H, ['knees'], 'beg', { timed: true }),
  ex('bulgarian-split-squat', 'סקוואט בולגרי', 'quads', H, ['knees', 'hips'], 'adv'),

  // hamstrings
  ex('leg-curl', 'כפיפת ברכיים במכונה', 'hamstrings', G, []),
  ex('db-rdl', 'דדליפט רומני עם משקולות', 'hamstrings', GH, ['lowerBack'], 'beg', { gear: ['dumbbells'] }),
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
  ex('dead-bug', 'דד באג (תרגיל ליבה)', 'core', GH, []),
  ex('plank', 'פלאנק', 'core', GH, ['shoulders', 'wrists'], 'beg', { timed: true, mil: true }),
  ex('cable-crunch', 'כפיפת בטן בכבל', 'core', G, ['neck']),
  ex('mountain-climbers', 'מטפסי הרים', 'core', H, ['wrists', 'shoulders'], 'mid', { mil: true }),
  ex('hanging-knee-raise', 'הרמת ברכיים בתלייה', 'core', G, ['shoulders', 'wrists'], 'mid'),

  // more variety, used by long workouts
  ex('incline-fly', 'פרפר בשיפוע עם משקולות', 'chest', G, ['shoulders'], 'mid'),
  ex('decline-db-press', 'לחיצת חזה בשיפוע תחתון', 'chest', G, ['shoulders', 'wrists'], 'mid'),
  ex('cable-crossover', 'הצלבת כבלים', 'chest', G, ['shoulders'], 'mid'),
  ex('close-grip-pulldown', 'משיכת פולי עליון באחיזה צרה', 'back', G, ['shoulders', 'elbows'], 'beg'),
  ex('straight-arm-pulldown', 'משיכה בידיים ישרות בפולי', 'back', G, ['shoulders'], 'beg'),
  ex('t-bar-row', 'חתירה בטי-בר', 'back', G, ['lowerBack', 'wrists'], 'mid'),
  ex('arnold-press', 'לחיצת ארנולד', 'shoulders', GH, ['shoulders', 'wrists'], 'mid', { gear: ['dumbbells'] }),
  ex('front-raise', 'הרמות לפנים', 'shoulders', GH, ['shoulders'], 'beg', { gear: ['dumbbells'] }),
  ex('cable-lateral-raise', 'הרמות צד בכבל', 'shoulders', G, ['shoulders'], 'beg'),
  ex('bent-rear-raise', 'הרמות אחוריות בהטיית גו', 'rear', GH, ['lowerBack'], 'beg', { gear: ['dumbbells'] }),
  ex('incline-curl', 'כפיפת מרפק בספסל משופע', 'biceps', G, ['elbows'], 'beg'),
  ex('preacher-curl', 'כפיפת מרפק על ספסל כמרצה', 'biceps', G, ['elbows', 'wrists'], 'beg'),
  ex('barbell-curl', 'כפיפת מרפק במוט', 'biceps', G, ['elbows', 'wrists'], 'beg'),
  ex('concentration-curl', 'כפיפת ריכוז', 'biceps', GH, ['elbows', 'wrists'], 'beg', { gear: ['dumbbells'] }),
  ex('rope-pushdown', 'פשיטת מרפק בחבל', 'triceps', G, ['elbows'], 'beg'),
  ex('skull-crusher', 'פשיטת מרפק בשכיבה', 'triceps', G, ['elbows', 'wrists'], 'mid'),
  ex('cable-one-arm-extension', 'פשיטת מרפק ביד אחת בכבל', 'triceps', G, ['elbows'], 'beg'),
  ex('close-grip-bench', 'לחיצת חזה באחיזה צרה', 'triceps', G, ['shoulders', 'elbows', 'wrists'], 'mid'),
  ex('tricep-dips', 'מקבילים', 'triceps', G, ['shoulders', 'elbows', 'wrists'], 'mid'),

  // more home options: kettlebell, bands, a step or box
  ex('kb-goblet-squat', 'סקוואט גביע עם קטלבל', 'quads', H, ['knees'], 'beg', { gear: ['kettlebell'] }),
  ex('kb-row', 'חתירה עם קטלבל ביד אחת', 'back', H, ['lowerBack'], 'beg', { gear: ['kettlebell'] }),
  ex('kb-floor-press', 'לחיצת חזה על הרצפה עם קטלבל', 'chest', H, ['shoulders', 'wrists'], 'beg', { gear: ['kettlebell'] }),
  ex('kb-press', 'לחיצת כתפיים עם קטלבל', 'shoulders', H, ['shoulders', 'wrists'], 'mid', { gear: ['kettlebell'] }),
  ex('kb-overhead-extension', 'פשיטת מרפק מעל הראש עם קטלבל', 'triceps', H, ['elbows', 'shoulders'], 'beg', { gear: ['kettlebell'] }),
  ex('kb-swing', 'סווינג קטלבל', 'glutes', H, ['lowerBack'], 'mid', { gear: ['kettlebell'] }),
  ex('kb-single-leg-rdl', 'דדליפט רגל אחת עם קטלבל', 'hamstrings', H, ['lowerBack'], 'mid', { gear: ['kettlebell'] }),
  ex('band-pull-apart', 'פתיחת גומייה לצדדים', 'rear', H, [], 'beg', { gear: ['bands'] }),
  ex('band-chest-press', 'לחיצת חזה עם גומייה', 'chest', H, ['shoulders'], 'beg', { gear: ['bands'] }),
  ex('band-shoulder-press', 'לחיצת כתפיים עם גומייה', 'shoulders', H, ['shoulders'], 'beg', { gear: ['bands'] }),
  ex('band-lateral-raise', 'הרמות צד עם גומייה', 'shoulders', H, ['shoulders'], 'beg', { gear: ['bands'] }),
  ex('band-squat', 'סקוואט עם גומייה', 'quads', H, ['knees'], 'beg', { gear: ['bands'] }),
  ex('band-hip-extension', 'בעיטה לאחור עם גומייה', 'glutes', H, ['hips'], 'beg', { gear: ['bands'] }),
  ex('band-good-morning', 'בוקר טוב עם גומייה', 'hamstrings', H, ['lowerBack'], 'beg', { gear: ['bands'] }),
  ex('band-calf-raise', 'הרמות תאומים עם גומייה', 'calves', H, ['ankles'], 'beg', { gear: ['bands'] }),
  ex('band-overhead-extension', 'פשיטת מרפק מעל הראש עם גומייה', 'triceps', H, ['elbows', 'shoulders'], 'beg', { gear: ['bands'] }),
  ex('step-up', 'עלייה על מדרגה', 'glutes', H, ['knees', 'hips'], 'beg', { gear: ['step'] }),
  ex('box-jump', 'קפיצה על קופסה', 'quads', H, ['knees', 'ankles'], 'mid', { gear: ['step'] }),
  ex('russian-twist', 'סיבוב רוסי', 'core', GH, ['lowerBack'], 'beg'),
  ex('side-plank', 'פלאנק צד', 'core', GH, ['shoulders', 'wrists'], 'beg', { timed: true }),
  ex('single-leg-bridge', 'גשר ישבן ברגל אחת', 'glutes', H, ['hips'], 'mid'),
  ex('db-lunge', 'מכרעים עם משקולות', 'quads', GH, ['knees', 'hips'], 'mid', { gear: ['dumbbells'] }),
  ex('db-bent-row', 'חתירה בשתי משקולות בהטיית גו', 'back', GH, ['lowerBack'], 'beg', { gear: ['dumbbells'] }),
  ex('db-calf-raise', 'הרמות תאומים עם משקולת', 'calves', GH, ['ankles'], 'beg', { gear: ['dumbbells'] })
]);

export function exerciseById(id) {
  return LOCAL_EXERCISES.find((e) => e.id === id) || null;
}
