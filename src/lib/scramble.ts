/**
 * Text-decrypt effect: the real text stays in the DOM (and in the layout, and
 * in the accessibility tree) while a sibling mask laid over it churns through
 * random glyphs and resolves left to right.
 *
 * Markup a target as:
 *
 *   <span class="scramble" data-scramble>
 *     <span class="scramble__real">Real text</span>
 *     <span class="scramble__mask" aria-hidden="true"></span>
 *   </span>
 *
 * The matching rules live in `global.css` under `.scramble`; the mask is only
 * painted while an ancestor carries `.is-ciphered`.
 */

/** Punctuation-heavy: reads as a cipher, and monospaced text can't jitter. */
const CIPHER_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!<>-_\/[]{}=+*^?#%&@';

/**
 * For proportional faces, where punctuation and capitals swing the line width
 * around. Lowercase only, minus the two widest glyphs: measured against the
 * hero's Courgette this holds a cipher inside the width of the real text,
 * where the full set ran a third over it.
 */
const LETTER_CHARS = 'abcdefghijklnopqrstuvxyz';

/** Frames the resolve edge takes to sweep the whole string, at any length. */
const SWEEP_FRAMES = 26;

type QueueItem = { to: string; start: number; end: number; char: string };

class Scrambler {
  private mask: HTMLElement;
  private text: string;
  private chars: string;
  private queue: QueueItem[] = [];
  private frame = 0;
  private raf = 0;
  private done: (() => void) | null = null;

  constructor(wrap: HTMLElement) {
    this.mask = wrap.querySelector<HTMLElement>('.scramble__mask')!;
    this.text = wrap.querySelector<HTMLElement>('.scramble__real')!.textContent ?? '';
    // Opt a target out of punctuation with data-scramble="letters".
    this.chars = wrap.dataset.scramble === 'letters' ? LETTER_CHARS : CIPHER_CHARS;
  }

  private randChar = () => this.chars[Math.floor(Math.random() * this.chars.length)];

  /** Freeze the text as a static cipher — whitespace kept so words still wrap. */
  cipher() {
    cancelAnimationFrame(this.raf);
    this.done = null;
    this.mask.textContent = this.text.replace(/\S/g, this.randChar);
  }

  decrypt(onDone: () => void) {
    cancelAnimationFrame(this.raf);
    this.done = onDone;
    this.frame = 0;

    // The sweep is scaled to the length, so a short title and a long paragraph
    // finish together — about three quarters of a second either way.
    const step = SWEEP_FRAMES / Math.max(this.text.length, 1);
    this.queue = [...this.text].map((to, i) => {
      const start = Math.round(i * step) + Math.floor(Math.random() * 4);
      return { to, start, end: start + 6 + Math.floor(Math.random() * 10), char: this.randChar() };
    });

    this.update();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.done = null;
  }

  private update = () => {
    let out = '';
    let settled = 0;

    for (const item of this.queue) {
      if (!item.to.trim()) {
        out += item.to;
        settled++;
      } else if (this.frame >= item.end) {
        out += item.to;
        settled++;
      } else {
        // Churn faster once a character is inside its own window.
        const churn = this.frame >= item.start ? 0.32 : 0.12;
        if (Math.random() < churn) item.char = this.randChar();
        out += item.char;
      }
    }

    this.mask.textContent = out;

    if (settled === this.queue.length) {
      const done = this.done;
      this.done = null;
      done?.();
      return;
    }

    this.frame++;
    this.raf = requestAnimationFrame(this.update);
  };
}

export type ScrambleGroup = {
  /** Put every target back to a static cipher. */
  cipher: () => void;
  /** Resolve every target; the root loses `.is-ciphered` once all have landed. */
  decrypt: () => void;
  /** Cancel any animation in flight — for React cleanup. */
  stop: () => void;
};

/**
 * Cipher every `[data-scramble]` inside `root` and hand back the controls.
 * `root` carries `.is-ciphered` for as long as any of them is unresolved.
 */
export function armScramble(root: HTMLElement): ScrambleGroup {
  const parts = [...root.querySelectorAll<HTMLElement>('[data-scramble]')].map(
    (wrap) => new Scrambler(wrap),
  );
  let pending = 0;

  const cipher = () => {
    root.classList.add('is-ciphered');
    parts.forEach((part) => part.cipher());
  };

  const decrypt = () => {
    if (!root.classList.contains('is-ciphered')) return;
    pending = parts.length;
    parts.forEach((part) =>
      part.decrypt(() => {
        if (--pending === 0) root.classList.remove('is-ciphered');
      }),
    );
  };

  const stop = () => {
    parts.forEach((part) => part.stop());
    root.classList.remove('is-ciphered');
  };

  cipher();
  return { cipher, decrypt, stop };
}

