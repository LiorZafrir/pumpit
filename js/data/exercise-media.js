// Maps our catalog ids to free-exercise-db records (github.com/yuhonas/free-exercise-db, Unlicense).
// Each record has two JPEG frames (start and end of the movement), kept in assets/exercises/<MediaId>/.
// Exercises without an entry simply show no picture. Fetched by tools/fetch-exercise-images.mjs.

export const MEDIA_IDS = Object.freeze({
  'local-machine-chest-press': 'Leverage_Chest_Press',
  'local-db-bench-press': 'Dumbbell_Bench_Press',
  'local-incline-push-up': 'Incline_Push-Up',
  'local-push-up': 'Pushups',
  'local-bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'local-db-incline-press': 'Incline_Dumbbell_Press',
  'local-cable-fly': 'Flat_Bench_Cable_Flyes',
  'local-decline-push-up': 'Push-Ups_With_Feet_Elevated',
  'local-lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'local-seated-row': 'Seated_Cable_Rows',
  'local-inverted-row': 'Inverted_Row',
  'local-db-row': 'One-Arm_Dumbbell_Row',
  'local-barbell-row': 'Bent_Over_Barbell_Row',
  'local-pull-up': 'Pullups',
  'local-superman': 'Superman',
  'local-machine-shoulder-press': 'Leverage_Shoulder_Press',
  'local-db-shoulder-press': 'Dumbbell_Shoulder_Press',
  'local-lateral-raise': 'Side_Lateral_Raise',
  'local-face-pull': 'Face_Pull',
  'local-reverse-fly': 'Reverse_Flyes',
  'local-cable-curl': 'Standing_Biceps_Cable_Curl',
  'local-db-curl': 'Dumbbell_Bicep_Curl',
  'local-hammer-curl': 'Hammer_Curls',
  'local-pushdown': 'Triceps_Pushdown',
  'local-overhead-extension': 'Cable_Rope_Overhead_Triceps_Extension',
  'local-bench-dips': 'Bench_Dips',
  'local-diamond-push-up': 'Push-Ups_-_Close_Triceps_Position',
  'local-leg-press': 'Leg_Press',
  'local-goblet-squat': 'Goblet_Squat',
  'local-bodyweight-squat': 'Bodyweight_Squat',
  'local-leg-extension': 'Leg_Extensions',
  'local-back-squat': 'Barbell_Full_Squat',
  'local-walking-lunge': 'Bodyweight_Walking_Lunge',
  'local-leg-curl': 'Lying_Leg_Curls',
  'local-db-rdl': 'Stiff-Legged_Dumbbell_Deadlift',
  'local-barbell-rdl': 'Romanian_Deadlift',
  'local-glute-bridge': 'Butt_Lift_Bridge',
  'local-hip-thrust': 'Barbell_Hip_Thrust',
  'local-cable-kickback': 'One-Legged_Cable_Kickback',
  'local-standing-calf-raise': 'Standing_Calf_Raises',
  'local-dead-bug': 'Dead_Bug',
  'local-plank': 'Plank',
  'local-cable-crunch': 'Cable_Crunch',
  'local-mountain-climbers': 'Mountain_Climbers'
});

export function mediaFrames(exerciseId) {
  const mediaId = MEDIA_IDS[exerciseId];
  return mediaId ? [`./assets/exercises/${mediaId}/0.jpg`, `./assets/exercises/${mediaId}/1.jpg`] : null;
}
