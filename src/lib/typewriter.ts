/**
 * Typewriter: the text is typed in a character at a time with a caret riding
 * the end of it.
 *
 * Same two-layer trick as `scramble.ts` — the real text stays in the DOM and
 * in the layout (`visibility`, not `display`) while a sibling mask holds the
 * part typed so far. That is what keeps the page from jumping as lines fill
 * in, and it means screen readers always get the whole paragraph.
 *
 *   <span class="typed" data-typed>
 *     <span class="typed__real">Real text</span>
 *     <span class="typed__mask" aria-hidden="true"></span>
 *   </span>
 *
 * The rules live in `global.css` under `.typed`.
 */

/** Milliseconds per character, and the window the whole line is held to. */
const MS_PER_CHAR = 16;
const MIN_MS = 800;
const MAX_MS = 2200;

export type Typewriter = {
  /** Start typing. */
  type: () => void;
  /** Cancel and hand the text straight back — for cleanup. */
  stop: () => void;
};

export function armTypewriter(wrap: HTMLElement): Typewriter {
  const real = wrap.querySelector<HTMLElement>('.typed__real');
  const mask = wrap.querySelector<HTMLElement>('.typed__mask');
  const text = real?.textContent ?? '';

  // Nothing to type (an empty description, say) — leave the text alone.
  if (!real || !mask || !text) return { type: () => {}, stop: () => {} };

  // One text node and one caret, written to in place: no element churn per frame.
  const typed = document.createTextNode('');
  const caret = document.createElement('span');
  caret.className = 'typed__caret';
  mask.replaceChildren(typed, caret);
  wrap.classList.add('is-typing');

  let raf = 0;
  let settle = 0;

  const finish = () => {
    wrap.classList.add('is-done');
    // Hold the mask until the caret has faded; it reads identically to the
    // real text by now, so the hand-back is invisible.
    settle = window.setTimeout(() => wrap.classList.remove('is-typing'), 320);
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(settle);
    wrap.classList.remove('is-typing');
  };

  const type = () => {
    cancelAnimationFrame(raf);

    // Long paragraphs type faster rather than longer, so no line outstays the
    // reader's patience.
    const duration = Math.min(MAX_MS, Math.max(MIN_MS, text.length * MS_PER_CHAR));
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      typed.nodeValue = text.slice(0, Math.round(progress * text.length));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      finish();
    };

    raf = requestAnimationFrame(step);
  };

  return { type, stop };
}
