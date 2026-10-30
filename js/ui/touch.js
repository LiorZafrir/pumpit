// iOS Safari zooms the page on a double tap even with `touch-action: manipulation` in some modes
// (home-screen apps included). The second tap of a quick pair is cancelled, so the page can't zoom,
// and the button under the finger is activated by hand so fast repeated taps (+2.5 kg, +2.5 kg...) all count.

const DOUBLE_TAP_MS = 350;
const MOVE_TOLERANCE_PX = 10;
const CLICKABLE = 'button, a[href], [role="radio"], [role="switch"], summary';
const TEXT_FIELD = 'input, textarea, select, [contenteditable]';

export function preventDoubleTapZoom(doc = document) {
  let lastTapAt = 0;
  let start = null;

  doc.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    start = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null;
  }, { passive: true });

  doc.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const moved = !start || !t || Math.hypot(t.clientX - start.x, t.clientY - start.y) > MOVE_TOLERANCE_PX;
    start = null;
    if (moved) { lastTapAt = 0; return; } // a swipe or pinch, not a tap

    const target = e.target instanceof Element ? e.target : null;
    if (target && target.closest(TEXT_FIELD)) { lastTapAt = 0; return; } // let people place the cursor

    const now = Date.now();
    const isSecondTap = now - lastTapAt < DOUBLE_TAP_MS;
    lastTapAt = now;
    if (!isSecondTap) return;

    if (e.cancelable) e.preventDefault(); // stops the zoom and the browser's own click for this tap
    const clickable = target && target.closest(CLICKABLE);
    if (clickable && !clickable.disabled && clickable.getAttribute('aria-disabled') !== 'true') clickable.click();
  }, { passive: false });
}
