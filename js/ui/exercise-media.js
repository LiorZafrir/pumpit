// The two-frame "animation" of an exercise: start and end positions, cross-faded by CSS.
// Falls back to a plain icon when the exercise has no pictures or they fail to load (offline, first visit).
import { h } from './dom.js';
import { icon } from './icons.js';
import { mediaFrames } from '../data/exercise-media.js';

export function exerciseMedia(exerciseId) {
  const frames = mediaFrames(exerciseId);
  const fallback = () => h('div', { class: 'card media-slot', 'aria-hidden': 'true' }, icon('dumbbell', { size: 56 }));
  if (!frames) return fallback();

  const wrap = h('div', { class: 'ex-media', 'aria-hidden': 'true' });
  const imgs = frames.map((src, i) => {
    const img = h('img', { class: `ex-frame ex-frame-${i}`, src, alt: '', decoding: 'async', draggable: 'false' });
    img.addEventListener('error', () => wrap.replaceWith(fallback()), { once: true });
    return img;
  });
  wrap.append(...imgs);
  return wrap;
}
