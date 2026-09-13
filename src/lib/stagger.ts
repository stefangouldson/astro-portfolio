/**
 * Card entrance: each card flies in as it scrolls into view, one at a time
 * across a row, and then drifts. The animation itself lives in `global.css`
 * under `.float-in`; this only decides when each card is let in.
 *
 * Cards are marked up with `class="float-in"`; `staggerIn` arms them
 * (`is-armed`, which hides them) and lets them go one by one (`is-in`).
 * Nothing happens without JS or under `prefers-reduced-motion`, so the cards
 * are simply there — call it behind `motionAllowed()`.
 */

type Options = {
  /** Gap between one card landing and the next in the same row. */
  stagger?: number;
  /** How much of a card must be showing before it is let in. */
  threshold?: number;
  /** Called as each card is released, with the delay it was given. */
  onLand?: (card: HTMLElement, delay: number) => void;
};

export function staggerIn(cards: HTMLElement[], options: Options = {}) {
  const { stagger = 110, threshold = 0.25, onLand } = options;
  if (!cards.length) return;

  cards.forEach((card) => card.classList.add('is-armed'));

  const land = (card: HTMLElement, delay: number) => {
    card.style.setProperty('--stagger', `${delay}ms`);
    card.classList.add('is-in');
    onLand?.(card, delay);
  };

  if (!('IntersectionObserver' in window)) {
    cards.forEach((card, i) => land(card, i * stagger));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      // Cards that cross together are a row: bring them in left to right.
      // DOM order is left to right at every breakpoint, so the column count
      // never has to be worked out.
      entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target as HTMLElement)
        .sort((a, b) => cards.indexOf(a) - cards.indexOf(b))
        .forEach((card, i) => {
          land(card, i * stagger);
          observer.unobserve(card);
        });
    },
    { threshold },
  );

  cards.forEach((card) => observer.observe(card));
}
