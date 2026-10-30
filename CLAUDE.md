# PumpIt — אפיון לפיתוח

שם האפליקציה: **PumpIt**. שם מוצע למאגר ב-GitHub: `pumpit` (כתובת: liorzafrir.github.io/pumpit).

אפליקציית תוכנית אימונים לאייפון, נבנית כ-PWA (מותקנת מספארי למסך הבית), בלי App Store.
שלב ראשון: שימוש אישי. בהמשך: שיתוף עם חברים, ואולי מעבר לנייטיב דרך Capacitor.
תזונה — שלב מאוחר יותר, לא עכשיו.

הדמיות העיצוב (קנבס): https://claude.ai/artifact/U8dsL9JGNvt5exJTn2d75n
מסכים בקנבס: שאלון פתיחה, מסך בית, אימון בזמן סט, רישום סט, מנוחה, סיכום אימון, התקדמות, הגדרות.

## סטאק

- HTML / CSS / JavaScript רגיל עם ES modules, בלי שלב build (כמו Family Hub). אירוח ב-GitHub Pages.
- Firebase modular SDK (v10+) מה-CDN של gstatic: Authentication + Firestore.
- PWA: `manifest.webmanifest` (display: standalone, אייקונים 192/512, apple-touch-icon) ו-`sw.js` לקאש של קבצי האפליקציה.
- כל הממשק בעברית: `<html lang="he" dir="rtl">`. בקוד להשתמש ב-logical properties (`margin-inline-start` וכו').
- מאגר תרגילים: בפיתוח WorkoutX (מסלול חינמי, 500 בקשות לחודש, מותר קאש של עד 24 שעות בלבד, אסור לשמור את המאגר באופן קבוע). כשמרחיבים למשתמשים נוספים: רישיון חד-פעמי של ExerciseDB (exercisedb.io), אחסון עצמי, מותר שימוש מסחרי בתוך האפליקציה, אסור להפיץ את הקבצים עצמם.
- ב-Firestore שומרים רק מזהה תרגיל (`exerciseId`) ונתוני ביצוע, לא את תוכן המאגר של WorkoutX.

## Firebase — כבר הוגדר

- פרויקט: `pumpit-e5229` (מסלול Spark החינמי). Google Analytics ו-Gemini כבויים.
- Authentication: התחברות עם Google מופעלת. Support email: zafrir1986@gmail.com.
- Firestore: מסד `(default)`, Standard edition, מיקום `me-west1` (תל אביב), נוצר ב-production mode (הכול חסום עד שמעלים את firestore.rules).
- אפליקציית ווב רשומה בשם "PumpIt Web". ההגדרות נמצאות ב-`js/firebase-config.js`.
- עוד לא בוצע: הוספת `liorzafrir.github.io` ל-Authorized domains ב-Authentication › Settings, והגבלת ה-API key לדומיין הזה ב-Google Cloud Console.

## עיצוב

מראה נקי, עתידני ורך: לא כהה מדי ולא בהיר מדי. בלי אימוג'י, אייקונים קוויים בלבד (stroke 1.8–2.2).

צבעים (CSS custom properties על `:root`):

| טוקן | ערך | שימוש |
|---|---|---|
| `--bg` | `#1B212C` | רקע המסך (גרפיט כחלחל) |
| `--bg-deep` | `#141921` | רקע מאחורי bottom sheet |
| `--sheet` | `#262D3A` | חלון שעולה מלמטה |
| `--card` | `rgba(255,255,255,0.05)` | כרטיס רגיל |
| `--card-strong` | `rgba(255,255,255,0.07)` | כרטיס מודגש |
| `--line` | `rgba(255,255,255,0.08)` | מסגרות |
| `--text` | `#EEF1F6` | טקסט ראשי |
| `--text-2` | `#D5DAE3` | טקסט גוף |
| `--text-3` | `#AEB6C4` | משני |
| `--muted` | `#9AA3B2` | תוויות קטנות |
| `--on-accent` | `#12161D` | טקסט על כפתור בצבע המבטא |
| `--accent` | לפי ערכת הנושא | כפתורים, התקדמות, טבעות |

ערכות נושא (רק `--accent` משתנה): ירוק ליים `#C6F432`, כחול נאון `#3DB8FF`, ורוד נאון `#FF4FA3`, כתום `#FF8A2A`, אדום `#FF4D4D`, צהוב `#FFD43B`, סגול `#A98BFF`.
ברירת מחדל לפי השאלון: אישה → ורוד, גבר → ירוק ליים. המשתמש יכול להחליף בהגדרות, עם תצוגה מקדימה חיה.
שגיאות מוצגות תמיד עם אייקון וטקסט. צבע שגיאה `#FF6B6B`, ואם הערכה היא אדום — `#FFB547`, כדי שלא יתבלבל עם הכפתורים.

- גופנים: Heebo (300/400/500/700/800) לכל הממשק, Secular One לכותרות גדולות ("מנוחה", "האימון הושלם", כותרות השאלון).
- פינות: 28 (כרטיס ראשי), 22, 18 (כפתורים גדולים), 14, 12. כדורים: 999.
- זוהר עדין בצבע המבטא רק על הכפתור הראשי, טבעות התקדמות ונקודות פעימה. לא בכל מקום.
- מספרים: `font-variant-numeric: tabular-nums`. כפתור ראשי בגובה 56–60px, כל אזור לחיצה לפחות 44px.
- ניווט תחתון צף עם שלוש לשוניות: בית, התקדמות, פרופיל (רקע שקוף-למחצה עם `backdrop-filter: blur`).
- אנימציות מעבר קצרות (~200ms). לכבד `prefers-reduced-motion`.

## מסכים וזרימה

1. **הרשמה/התחברות** — Firebase Auth (Google, ובהמשך גם מייל וסיסמה).
2. **שאלון פתיחה** — 6 שלבים קצרים עם פס התקדמות, שאלה או שתיים בכל מסך:
   מין וגיל · גובה ומשקל · מטרה (חיטוב / הרזיה / מסה / כושר כללי) · רמת ניסיון (מתחיל / בינוני / מתקדם) · ימים בשבוע (2–6, עם הצגת החלוקה המומלצת) · אזורים רגישים (בחירה מרובה, אפשר לדלג).
3. **מסך בית** — ברכה + רצף, פס שבועי של 7 ימים, כרטיס "האימון של היום" עם מתג חדר כושר / בית (נבחר בכל אימון מחדש, זוכר את הבחירה האחרונה), תצוגה מקדימה של התרגילים, כפתור "התחל אימון", ונתון התקדמות אחד.
4. **אימון בזמן סט** — שם התרגיל, "סט X / Y", פס התקדמות של כל האימון, אנימציית התרגיל, יעד חזרות ומשקל + "בפעם הקודמת", כפתור "סיימתי סט", כפתור החלפת תרגיל. בלי טיימר בזמן סט (חוץ מתרגילים שנמדדים בזמן, כמו פלאנק).
5. **רישום סט** — bottom sheet שממולא מראש במשקל ובחזרות של הפעם הקודמת. אישור בלחיצה אחת, תיקון עם פלוס/מינוס (משקל בקפיצות של 2.5 ק״ג). אישור מתחיל מנוחה אוטומטית.
6. **מנוחה** — טיימר עגול שסופר לאחור, ‎−15 / דלג / ‎+15, כרטיס "הבא בתור", רשימת סטים שהושלמו. רטט וצליל בסוף המנוחה.
7. **סיכום אימון** — זמן, סטים שהושלמו מתוך מתוכננים, נפח כולל, שיאים חדשים, סטטוס לכל תרגיל (שיא / הושלם / חלקי), "בפעם הבאה".
8. **התקדמות** — בחירת תקופה (חודש / 3 חודשים / שנה), גרף משקל עבודה לכל תרגיל, משקל גוף עם קו מגמה, שיאים אחרונים.
9. **הגדרות ופרופיל** — עריכת פרטים, ערכת נושא, שיטת חלוקה (אוטומטי / גמיש / ידני), זמן מנוחה ברירת מחדל, ציוד לבית וסגנון (קליסטניקס / צבאי / רגיל), טכניקות מתקדמות.

## לוגיקת אימון

- **חלוקה אוטומטית לפי ימים:** 2–3 → גוף מלא · 4 → עליון / תחתון · 5–6 → דחיפה / משיכה / רגליים.
- **מצב גמיש:** כל יום מציעים את קבוצות השרירים שהכי נחו, לפי הסטים האחרונים.
- **עומס מתקדם:** אם כל הסטים המתוכננים של תרגיל הושלמו ביעד החזרות → בפעם הבאה מציעים להוסיף משקל (2.5 ק״ג לפלג עליון, 5 ק״ג לפלג תחתון). אם לא → אותו משקל.
- **החלפת תרגיל:** תרגיל חלופי לאותו שריר, לפי הציוד הזמין (מתקן תפוס או כאב).
- **אזורים רגישים:** לסנן תרגילים שמעמיסים על האזורים שסומנו.
- **בית:** התרגילים לפי הציוד המסומן והסגנון שנבחר.
- **מצב "אין לי זמן":** בכרטיס האימון בוחרים 20 / 30 / 45 דקות. האימון מתקצר: מצמדים תרגילים לסופר סטים ומקצרים מנוחות, בלי לפספס את השרירים של היום.
- **טכניקות מתקדמות (מתגים בהגדרות):** סופר סטים ודרופ סטים. בדרופ סט, חלון הרישום מאפשר כמה משקלים באותו סט.

## מבנה נתונים ב-Firestore

```
users/{uid}
  name, sex, age, heightCm, weightKg, goal, level, daysPerWeek,
  injuries: string[], theme, lastLocation: 'gym' | 'home',
  settings: { split, restSec, homeGear: string[], homeStyle, shortMode, superset, dropset },
  createdAt, updatedAt

users/{uid}/workouts/{workoutId}
  date, location, title, startedAt, endedAt, durationSec,
  plannedSets, completedSets, volumeKg, status: 'active' | 'done'

users/{uid}/sets/{setId}            ← אוסף שטוח, נוח לשאילתות התקדמות לפי תרגיל
  workoutId, exerciseId, setIndex, reps, weightKg,
  targetReps, targetWeightKg, drops?: [{ reps, weightKg }], at

users/{uid}/exerciseState/{exerciseId}
  workingWeightKg, targetReps, lastDoneAt, prWeightKg, prReps

users/{uid}/bodyWeight/{yyyy-mm-dd}
  kg, at

exercises/{exerciseId}              ← רק בשלב ExerciseDB (אחסון עצמי), קריאה בלבד מהלקוח
```

## אבטחה

עקרונות:
- הכול חסום כברירת מחדל. כל משתמש קורא וכותב רק את המסמכים שתחת `users/{uid}` שלו.
- ולידציה בשרת על מה שנכתב: שדות מותרים בלבד, טיפוסים וטווחים הגיוניים.
- המפתחות בקובץ ההגדרות של Firebase הם ציבוריים מטבעם. מה שמגן על הנתונים הוא החוקים, ולכן אסור להשאיר חוקים פתוחים, גם לא "זמנית".
- לבדוק את החוקים עם Firebase Emulator לפני כל פריסה, כולל בדיקה שמשתמש אחד לא מצליח לקרוא נתונים של משתמש אחר.
- להגביל את ה-API key ב-Google Cloud Console לדומיין `liorzafrir.github.io`, ולהוסיף אותו ל-Authorized domains ב-Auth.
- מפתח WorkoutX: בצד הלקוח הוא חשוף לכל מי שפותח את האפליקציה. בשלב האישי זה סיכון קטן ומקובל. לפני שמשתפים עם אחרים: להעביר את הקריאות ל-Cloud Function שמחזיקה את המפתח (דורש מסלול Blaze, שגם בו יש מכסה חינמית), או לעבור ל-ExerciseDB באחסון עצמי.
- משקל, גיל ואזורים רגישים הם מידע אישי: לא לשמור יותר ממה שצריך, ולהוסיף בהגדרות "מחיקת חשבון" שמוחקת את כל הנתונים לפני שמשתפים עם חברים.
- App Check (reCAPTCHA v3/Enterprise) — מומלץ להוסיף כשיש משתמשים נוספים.

`firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function num(v, lo, hi) { return (v is int || v is float) && v >= lo && v <= hi; }

    function validProfile(d) {
      return d.keys().hasOnly(['name','sex','age','heightCm','weightKg','goal','level',
               'daysPerWeek','injuries','theme','lastLocation','settings','createdAt','updatedAt'])
        && (!('sex' in d) || d.sex in ['m','f'])
        && (!('age' in d) || num(d.age, 13, 100))
        && (!('heightCm' in d) || num(d.heightCm, 100, 250))
        && (!('weightKg' in d) || num(d.weightKg, 25, 350))
        && (!('goal' in d) || d.goal in ['tone','loss','mass','fit'])
        && (!('level' in d) || d.level in ['beg','mid','adv'])
        && (!('daysPerWeek' in d) || num(d.daysPerWeek, 1, 7))
        && (!('injuries' in d) || (d.injuries is list && d.injuries.size() <= 10))
        && (!('lastLocation' in d) || d.lastLocation in ['gym','home']);
    }

    function validSet(d) {
      return d.keys().hasOnly(['workoutId','exerciseId','setIndex','reps','weightKg',
               'targetReps','targetWeightKg','drops','at'])
        && d.workoutId is string && d.exerciseId is string
        && num(d.setIndex, 0, 50) && num(d.reps, 0, 300) && num(d.weightKg, 0, 600)
        && (!('drops' in d) || (d.drops is list && d.drops.size() <= 6));
    }

    match /users/{uid} {
      allow read, delete: if isOwner(uid);
      allow create, update: if isOwner(uid) && validProfile(request.resource.data);

      match /sets/{setId} {
        allow read, delete: if isOwner(uid);
        allow create, update: if isOwner(uid) && validSet(request.resource.data);
      }
      match /workouts/{workoutId} {
        allow read, write: if isOwner(uid);
      }
      match /exerciseState/{exerciseId} {
        allow read, write: if isOwner(uid);
      }
      match /bodyWeight/{day} {
        allow read, delete: if isOwner(uid);
        allow create, update: if isOwner(uid)
          && request.resource.data.keys().hasOnly(['kg','at'])
          && num(request.resource.data.kg, 25, 350);
      }
    }

    match /exercises/{exerciseId} {
      allow read: if signedIn();
      allow write: if false;   // עדכון המאגר רק דרך Console או סקריפט אדמין
    }
  }
}
```

אם בעתיד יישמרו קבצי מדיה ב-Firebase Storage (אנימציות של ExerciseDB): קריאה למשתמשים מחוברים בלבד, כתיבה חסומה מהלקוח.

## סדר עבודה מוצע

1. שלד PWA: manifest, service worker, ערכות נושא ב-CSS, ניווט תחתון, חיבור Firebase + Auth, וחוקי האבטחה עם בדיקות באמולטור.
2. שאלון פתיחה ושמירת הפרופיל.
3. מסך בית ויצירת "האימון של היום" לפי חלוקה, מיקום וציוד.
4. זרימת אימון: סט → רישום → מנוחה → סיכום, כולל שמירה ב-Firestore ועומס מתקדם.
5. חיבור WorkoutX (שמות, שרירים, אנימציות MP4) עם קאש של עד 24 שעות.
6. מסך התקדמות עם גרפים.
7. הגדרות: ערכות נושא, ציוד, סגנון, מתגים.
8. מצב "אין לי זמן", סופר סטים ודרופ סטים.
9. בהמשך: תזונה, מעבר ל-ExerciseDB, Capacitor לנייטיב (כולל Apple Health).

## כללי עבודה

- לבדוק כל מסך ברוחב 390px (אייפון), ב-RTL, ובמצב standalone.
- לא להשאיר חוקי Firestore פתוחים בשום שלב.
- לא לשמור את מאגר התרגילים של WorkoutX ב-Firestore או ב-localStorage מעבר ל-24 שעות.

## החלטות מימוש (שלב 1)

- חוקי `workouts` ו-`exerciseState` הוחמרו: רשימת שדות מותרת וטווחים (כמו ב-`sets`). נוספו גם ולידציות ל-`name`, `theme`, `settings` ו-`createdAt`/`updatedAt` בפרופיל. הבדיקות ב-`tests/rules/rules.test.js` (`npm run test:rules`).
- התחברות: popup בדפדפן רגיל, redirect במצב standalone של iOS. צריך לבדוק באייפון אחרי הפריסה, כי redirect מול `authDomain` שונה מהדומיין של האירוח עלול להיחסם ב-Safari.
- התקנת Java לאמולטור (Windows, JDK 21) דורשת משתני סביבה, אחרת האמולטור נופל עם "Unable to establish loopback connection":
  `JAVA_TOOL_OPTIONS="-Djava.io.tmpdir=C:/pumpit-tmp -Djdk.net.unixdomain.tmpdir=C:/pumpit-tmp -Djava.net.preferIPv4Stack=true"` (התיקייה `C:\pumpit-tmp` צריכה להתקיים).
- שרת פיתוח: `npm run serve` (פורט 5173). אייקונים זמניים: `npm run icons`.
- ה-service worker: network-first לקבצי האפליקציה, cache-first לגופנים ול-SDK. בכל גרסה מעלים את `VERSION` ב-`sw.js`, ומוסיפים קבצים חדשים לרשימת `SHELL`.
- אירוח: Firebase Hosting, כתובת ההתקנה הקבועה `https://pumpit-e5229.firebaseapp.com/` (חייבת להיות זהה ל-`authDomain`, אחרת ההתחברות ב-iOS standalone נכשלת בגלל חסימת אחסון בין דומיינים). פריסה: `npx.cmd firebase deploy --only hosting --project pumpit-e5229`. GitHub Pages נשאר גיבוי בלבד.
