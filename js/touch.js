// ─────────────────────────────────────────────────────────────
//  Phone / tablet controls.
//  Left thumb: a joystick (up = drive, down = reverse, sideways = steer).
//  Right thumb: BOOST and JUMP. Small buttons for ball cam and reset.
//  Uses pointer events, so several fingers work at once.
// ─────────────────────────────────────────────────────────────

// a phone or tablet: the main pointer is a finger. Touch-screen laptops have a
// mouse/trackpad as their main pointer, so they keep the keyboard layout.
export const isTouch = () =>
  matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(hover: hover)').matches);

const DEAD = 0.22; // stick dead-zone, as a fraction of its radius

export function buildTouchControls(hud, { onCam, onReset } = {}) {
  const state = { throttle: 0, steer: 0, boost: false, jump: false };

  const root = document.createElement('div');
  root.className = 'touch';
  root.innerHTML = `
    <div class="stick" aria-label="Drive">
      <div class="stick__base"><span class="stick__arrow stick__arrow--up"></span><span class="stick__arrow stick__arrow--down"></span></div>
      <div class="stick__knob"></div>
    </div>
    <div class="tbtns">
      <button type="button" class="tbtn tbtn--jump" aria-label="Jump">JUMP</button>
      <button type="button" class="tbtn tbtn--boost" aria-label="Boost">BOOST</button>
    </div>
    <div class="tmini">
      <button type="button" class="tmini__b" data-act="cam">Ball cam</button>
      <button type="button" class="tmini__b" data-act="reset">Reset</button>
    </div>`;
  hud.appendChild(root);

  // ── joystick ──
  const stick = root.querySelector('.stick');
  const base = root.querySelector('.stick__base');
  const knob = root.querySelector('.stick__knob');
  let stickId = null;
  const moveStick = (e) => {
    const r = base.getBoundingClientRect();
    const R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    knob.style.transform = `translate(calc(-50% + ${dx * R}px), calc(-50% + ${dy * R}px))`;
    const ax = Math.abs(dx) < DEAD ? 0 : (dx - Math.sign(dx) * DEAD) / (1 - DEAD);
    state.steer = -ax; // physics: +1 = left
    state.throttle = dy < -DEAD ? 1 : dy > DEAD ? -1 : 0;
  };
  const endStick = () => {
    stickId = null;
    knob.style.transform = '';
    state.steer = 0; state.throttle = 0;
    stick.classList.remove('is-active');
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stick.classList.add('is-active');
    moveStick(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', (e) => { if (e.pointerId === stickId) endStick(); });
  stick.addEventListener('pointercancel', (e) => { if (e.pointerId === stickId) endStick(); });

  // ── hold buttons ──
  const hold = (el, key) => {
    const on = (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); state[key] = true; el.classList.add('is-down'); };
    const off = () => { state[key] = false; el.classList.remove('is-down'); };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', off);
  };
  hold(root.querySelector('.tbtn--boost'), 'boost');
  hold(root.querySelector('.tbtn--jump'), 'jump');

  root.querySelector('[data-act="cam"]').addEventListener('click', () => onCam?.());
  root.querySelector('[data-act="reset"]').addEventListener('click', () => onReset?.());

  // no long-press menus or double-tap zoom on the controls
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  function release() {
    endStick();
    state.boost = state.jump = false;
    root.querySelectorAll('.is-down').forEach((b) => b.classList.remove('is-down'));
  }

  return { state, release, el: root };
}
