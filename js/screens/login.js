import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { describeAuthError, signInWithGoogle } from '../auth.js';

export function render({ initialError } = {}) {
  const errorSlot = h('div', { role: 'alert', 'aria-live': 'assertive' });
  const button = h('button', { class: 'btn btn-primary', type: 'button' }, icon('google'), 'המשך עם Google');

  function showError(err) {
    errorSlot.replaceChildren(
      h('div', { class: 'error-msg' }, icon('alert', { size: 20 }), h('span', null, describeAuthError(err)))
    );
  }

  if (initialError) showError(initialError);

  button.addEventListener('click', async () => {
    button.disabled = true;
    errorSlot.replaceChildren();
    try {
      await signInWithGoogle();
    } catch (err) {
      showError(err);
    } finally {
      button.disabled = false;
    }
  });

  return h('section', { class: 'screen login' },
    h('div', { class: 'login-hero' },
      h('div', { class: 'logo-mark' }, icon('bolt', { size: 44 })),
      h('h1', { class: 'display login-title' }, 'PumpIt'),
      h('p', { class: 'muted' }, 'תוכנית אימונים שמתאימה את עצמה אליך')
    ),
    h('div', { class: 'login-actions' }, errorSlot, button)
  );
}
