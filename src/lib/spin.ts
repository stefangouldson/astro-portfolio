/**
 * Grab-and-spin: drags the card around its own Y (and X) axis, carries the
 * throw on after release, then settles flat on whichever face ended up facing
 * the viewer. Angles are written to `--rx` / `--ry`; the transform itself is
 * the component's, so nothing here knows what is being spun.
 *
 * Under `prefers-reduced-motion` the drag still works — it is the visitor's own
 * hand — but the throw and the settle glide are dropped.
 */

/** Degrees turned per pixel dragged. */
const YAW_PER_PX = 0.4;
const PITCH_PER_PX = 0.3;
/** How far it can pitch before the card reads as falling over. */
const PITCH_LIMIT = 70;
/** Velocity kept per frame after release, and the point it is done. */
const FRICTION = 0.94;
const STILL = 0.05;
/** Share of the remaining angle closed per frame while settling. */
const SETTLE = 0.12;
/** Degrees per arrow-key press. */
const KEY_STEP = 15;
/**
 * Hover mode: the turn at the far edge of the card, and how much of the gap to
 * the pointer is closed per frame. 170deg means a sweep from edge to edge takes
 * it right round past the back and out the other side.
 */
const HOVER_YAW = 170;
const HOVER_PITCH = 16;
const CHASE = 0.1;

export type SpinOptions = {
  /** 'hover' turns with the pointer; 'drag' needs the button held (touch). */
  mode?: 'hover' | 'drag';
  /** Carry the throw on after release, and glide into the settle. */
  momentum?: boolean;
  /** Marked `is-busy` while the card is in play. */
  busy?: HTMLElement;
  /**
   * Element to listen on and measure in hover mode. It must NOT be
   * transformed: the card's own rect is its *projected* box, which moves as it
   * turns, so mapping the pointer against it feeds the rotation back into
   * itself. The stage is the card's layout box and stays put.
   */
  surface?: HTMLElement;
};

export type Spin = { stop: () => void };

export function armSpin(card: HTMLElement, options: SpinOptions = {}): Spin {
  const { mode = 'drag', momentum = true, busy, surface } = options;
  let rx = 0;
  let ry = 0;
  let vx = 0;
  let vy = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let raf = 0;

  const pitch = (v: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, v));
  const apply = () => {
    card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
  };

  /** The flat angle nearest where it stopped — it can rest on either face. */
  const restAngle = () => Math.round(ry / 180) * 180;

  const settleNow = () => {
    ry = restAngle();
    rx = 0;
    apply();
    busy?.classList.remove('is-busy');
  };

  const loop = () => {
    raf = 0;
    if (dragging) return;

    if (Math.abs(vx) > STILL || Math.abs(vy) > STILL) {
      vx *= FRICTION;
      vy *= FRICTION;
      ry += vy;
      rx = pitch(rx + vx);
    } else {
      const target = restAngle();
      ry += (target - ry) * SETTLE;
      rx += (0 - rx) * SETTLE;

      if (Math.abs(target - ry) < 0.05 && Math.abs(rx) < 0.05) {
        settleNow();
        return;
      }
    }

    apply();
    raf = requestAnimationFrame(loop);
  };

  const onDown = (e: PointerEvent) => {
    dragging = true;
    vx = 0;
    vy = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    // Keeps the drag alive past the card's edge. Not worth failing over if
    // the pointer is already gone by the time we ask.
    try {
      card.setPointerCapture(e.pointerId);
    } catch {
      /* no capture, drag still tracks while the pointer is over the card */
    }
    card.classList.add('is-grabbing');
    busy?.classList.add('is-busy');
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    vy = dx * YAW_PER_PX;
    vx = -dy * PITCH_PER_PX;
    ry += vy;
    rx = pitch(rx + vx);
    apply();
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('is-grabbing');

    if (!momentum) {
      settleNow();
      return;
    }
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') ry -= KEY_STEP;
    else if (e.key === 'ArrowRight') ry += KEY_STEP;
    else if (e.key === 'ArrowUp') rx = pitch(rx - KEY_STEP);
    else if (e.key === 'ArrowDown') rx = pitch(rx + KEY_STEP);
    else return;

    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    apply();
  };

  // --- hover mode -------------------------------------------------------
  // The pointer's position across the surface *is* the angle; the card chases
  // it a fraction at a time, which is what gives the turn its weight.
  const pad = surface ?? card;
  let wantY = 0;
  let wantX = 0;
  let tracking = false;

  const chase = () => {
    raf = 0;
    ry += (wantY - ry) * CHASE;
    rx += (wantX - rx) * CHASE;

    if (Math.abs(wantY - ry) < 0.05 && Math.abs(wantX - rx) < 0.05) {
      ry = wantY;
      rx = wantX;
      apply();
      if (!tracking) busy?.classList.remove('is-busy');
      return;
    }

    apply();
    raf = requestAnimationFrame(chase);
  };

  const aim = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    wantY = ((e.clientX - r.left) / r.width - 0.5) * 2 * HOVER_YAW;
    wantX = -((e.clientY - r.top) / r.height - 0.5) * 2 * HOVER_PITCH;
    if (!raf) raf = requestAnimationFrame(chase);
  };

  const onEnter = (e: PointerEvent) => {
    tracking = true;
    busy?.classList.add('is-busy');
    aim(e);
  };

  const onHover = (e: PointerEvent) => {
    if (tracking) aim(e);
  };

  const onLeave = () => {
    tracking = false;
    wantY = 0;
    wantX = 0;
    if (!raf) raf = requestAnimationFrame(chase);
  };

  if (mode === 'hover') {
    pad.addEventListener('pointerenter', onEnter);
    pad.addEventListener('pointermove', onHover);
    pad.addEventListener('pointerleave', onLeave);
  } else {
    card.addEventListener('pointerdown', onDown);
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onUp);
    card.addEventListener('pointercancel', onUp);
  }

  card.addEventListener('keydown', onKey);
  apply();

  return {
    stop: () => {
      cancelAnimationFrame(raf);
      pad.removeEventListener('pointerenter', onEnter);
      pad.removeEventListener('pointermove', onHover);
      pad.removeEventListener('pointerleave', onLeave);
      card.removeEventListener('pointerdown', onDown);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerup', onUp);
      card.removeEventListener('pointercancel', onUp);
      card.removeEventListener('keydown', onKey);
    },
  };
}
