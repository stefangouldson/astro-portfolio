/** True when the visitor has not asked for less motion. */
export function motionAllowed() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
