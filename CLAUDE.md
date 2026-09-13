# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies (Node >= 22.12.0) |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Static build to `./dist/` |
| `npm run preview` | Serve the built output |

When starting the dev server, prefer background mode: `astro dev --background`. Manage it with
`astro dev stop`, `astro dev status`, and `astro dev logs`.

There is no test runner, linter, or formatter configured. `astro check` is not usable as-is —
`@astrojs/check` and `typescript` are not installed.

## Architecture

Static Astro 7 site (`output: 'static'` by default) for a personal portfolio, with React islands and
Contentful as the CMS. There is no server runtime: **all Contentful data is fetched at build time**,
so publishing content requires a rebuild.

### Routes

The site is a **one-pager**. `src/pages/index.astro` composes the whole thing as five sections —
`#home` (the hero), `#about`, `#career`, `#projects`, `#contact` — and the nav scrolls between them
instead of navigating. New top-level content becomes a section there, not a page.

Key Skills is `SkillsGrid.astro` (dark cards on the orange band, from `src/data/skills.json`),
the static replacement for what used to be a React accordion island. Its cards fly in and drift like
the project cards (**Card entrance** below); the text underneath lands scrambled and decrypts on
hover (desktop) or once the card has landed (touch) — see **Text decrypt** below.

`#career` is split across two bands — the heading and intro sit on `.primaryBG`,
then a `Worked At` logo band, then `CareerTimeline.astro` opens its own `.whiteBG .content` block,
so the timeline itself is dark text on white. Its entries rise into place one at a time as you
scroll down to them (`.rise-in`, **Card entrance** below) — which is why it is the one section with
no `<Reveal>` around it: a band-level fade on top of that only muddies it. Its entries come from `src/data/career.json` (`period` / `role` / optional `company` /
`summary` as an array of paragraphs / `tags`). The timeline alternates sides around one centre
rail drawn by `.timeline::before`, with `:nth-child` deciding which edge each entry's dot sits on;
below 900px it collapses to a single rail on the left.

The only other routes are `src/pages/projects/[slug].astro` (the Contentful case studies the project
cards link out to, where the screenshot is `ProjectShot.astro` — a card you grab and spin, see
**Spin** below) and `src/pages/success.astro` (the contact form's redirect target). The old
`/about`, `/projects` and `/contact` URLs are kept alive as `redirects` in `astro.config.mjs`,
pointing at their section anchor.

Section headings are `PageHeading level={2}` — the hero owns the page's only `<h1>`. Sub-headings
inside a section (`Key Skills`, `Tech Stack`, `Worked With`) are `<h3 class="section-title">`,
which keeps the outline honest while `.section-title` in `global.css` holds them at `h2`'s size.
Timeline job titles are plain `<h3>`s at their own size.

### Content pipeline

`src/lib/contentful.ts` is the single boundary to the CMS. Everything else imports `getProjects`,
`getProject` and the `CardItem` / `Project` types from it.

- It normalises raw Contentful entries into the flat `CardItem` shape (`title`, `slug`, `description`,
  `tags`, `image`, `publishedAt`, `featured`) so pages and `CardList` never touch `entry.fields`.
- It **never throws**: missing credentials or a failed query logs a warning and returns `[]`, so the
  site builds (with an empty Projects page) before the API key exists. Preserve this — pages render an
  `empty` message rather than erroring.
- Protocol-relative Contentful asset URLs (`//images.ctfassets.net/...`) are rewritten to `https:`.
  Any new asset field needs the same treatment.
- Dates are formatted here (`en-GB`), not in components.

Expected Contentful content type (ID overridable via env): `projects`, ordered by `fields.order`,
with a rich-text `content` field.

**The live space's project type is actually `project` (singular), so the `projects` default is
wrong for it** and the query fails with `unknownContentType` — which the error handling turns into
a silently empty Projects page. `.env` sets `CONTENTFUL_PROJECT_TYPE_ID=project` to correct this;
because `.env` is gitignored, any deploy environment needs that variable too (or the default in
`contentful.ts` should be changed).

`src/lib/rich-text.ts` turns the rich-text `Document` into an HTML string, emitting **classes, not
inline styles** — the matching rules live in `global.css` under `.contentful-content`. Pages inject
it with `set:html` inside a `<div class="contentful-content">`; the surrounding section sets
`--rt-rule` / `--rt-figure-border` and `color` so the same body copy works on white and orange
backgrounds.

The dynamic route `src/pages/projects/[slug].astro` calls the list fetcher once in
`getStaticPaths` and passes both the entry **and** the related-items list through `props`, so each
build makes one API round-trip rather than one per page.

### Islands

Only three components hydrate; everything else ships zero JS. All three are on the one page:

- `Nav.tsx` — `client:load`, rendered by `Layout.astro` on every page. Its links are section anchors
  (`/#about`), so they still work without JS; with JS it intercepts the click, closes the bar and
  scrolls. Two things about that scroll are deliberate: it uses `window.scrollTo`, not
  `scrollIntoView`, because `body { overflow-x: hidden }` makes the body a scroll container that
  `scrollIntoView` jumps instantly instead of easing the viewport; and it takes the target offset
  from the `offsetParent` chain rather than `getBoundingClientRect()`, which would fold in the
  `-50vh` transform `<main>` still carries while the bar slides shut and land half a viewport out.
  Opening it toggles `.nav-open` on `documentElement`, which slides `<main>` up in `global.css`. The active card comes from an `IntersectionObserver` over the
  nav-linked sections (a thin band across the middle of the viewport), **paused while the bar is
  open** —
  the `<main>` transform would otherwise shift the band onto the next section. It still takes
  `pathname`, but only to flag Projects on a `/projects/<slug>` page, where the observer finds
  nothing to watch and the anchors fall back to real navigation. The button also pulses its border
  while the page is moving (`.isScrolling` / `nav-pulse`): the scroll handler keeps its own plain
  `moving` flag so `setState` runs twice per scroll rather than on every event, and the pulse's
  resting keyframe is `currentColor` — the border already matches the icon in both states, so one
  keyframe covers open and closed without knowing which is showing. The flash ring is a `box-shadow`
  rather than a thicker border, which would resize the content box under the icon.
- `Hero.tsx` — `client:load` (`index.astro`), pointer-tracking split reveal. Both halves of the
  heading are armed as one scramble group, so the wipe never uncovers a decrypted right side under
  a still-ciphered left one; it decrypts on view, never on hover.
- `ContactForm.tsx` — `client:load` (`index.astro`).

### Styling conventions

- `src/styles/global.css` owns design tokens (`--colour-bg` `#222831`, `--colour-accent` `#ffa500`,
  the three font families, nav timings, `--shadow-lift` for the cards), the responsive type scale,
  and the shared `.button` / `.input` / `.contentful-content` / `.reveal-*` / `.float-in` /
  `.scramble` rules. It is imported once by `Layout.astro`.
- `--shadow-lift` is the one card shadow, used by both `SkillsGrid` and `LinkCard`: an even halo on
  all four sides plus a softer cast below, so a card reads as lifted off the page rather than
  stuck to it. Change it there and both grids follow.
- Section layout is composed from helper classes: `.content` (padding) plus one of `.primaryBG`
  (dark), `.secondaryBG` (orange), `.whiteBG`. Card colour follows the section — `CardList` maps
  `color="white"` to orange cards and `color="secondary"` to dark cards.
- `.astro` components keep their CSS in a scoped `<style>` block.
- React components cannot use scoped styles, so each pairs with a **plain sibling `.css` file that
  the consuming `.astro` page imports** — `nav.css` in `Layout.astro`; `hero.css`,
  `contact-form.css` in `index.astro`. A new island needs its stylesheet imported at the
  page/layout level, not from the `.tsx`.
- `LogoWall.astro` is the orange logo band, used twice with different data: `WorkedWith.astro`
  (clients, in `#projects`) and `WorkedAt.astro` (employers, in `#career`). Each wrapper holds only
  its own `Company[]` and a title — the markup, the white-logo `filter`, the hover and the flip-in
  are in `LogoWall`, so changes land on both. Its logos swing up from edge-on one after another
  (`.flip-in`, **Card entrance** below); both walls share the one observer, being far enough apart
  never to cross together. `<Reveal>` here wraps only the `<h3>`, not the logos, which reveal
  themselves.
- `Footer.astro` is rendered by `Layout.astro` on every page, **outside `<main>`** so it stays the
  page's footer rather than main's content — which means `global.css` has to give it the same
  `.nav-open` transform as `<main>`, or the nav would open over a footer that had not moved. Its
  year is stamped at build time and corrected by an inline script, since a static build would
  otherwise freeze it until the next deploy.
- `Reveal.astro` wraps sections in a scroll-in animation. Its inline script *arms* the effect from
  JS (`.reveal-armed`), so without JS or with `prefers-reduced-motion` the content stays at full
  opacity. **Its observer threshold must stay 0.** An `intersectionRatio` is a fraction of the
  *element*, not of the viewport, so an element more than ~10 viewports tall can never reach a 0.1
  threshold — it arms itself to `opacity: 0` and is never revealed, which is to say it renders, then
  vanishes for good. `Reveal` wraps whole sections, and the rich text on a project page runs to 13
  viewports on a laptop; at a 375px-tall viewport, half the case studies sat within 0.06 of that old
  threshold, which is why only *some* of them broke. The `-10%` bottom `rootMargin` is what holds
  the reveal back until the element is properly in view — the threshold was never doing that job. `PageHeading.astro` arms its title wipe the same way (`.is-armed` / `.is-wiping`), so the
  wipe fires when the section scrolls in rather than all four at once on load. That wipe is a
  `clip-path` over a fill layer pinned at the title's full size, with the caret as a separate
  `::after` — **not** a growing `width`. Growing the width re-flows the pseudo's text every frame,
  and its final content box lands 2px short (the caret's border, under the global `border-box`), so
  a second word wrapped to a line `height: 100%` then clipped: one-word titles filled, `Career
  Timeline` never did. Keep the fill layer at `inset: 0` so it wraps exactly as the outline does. Every animation in
  the codebase has a `prefers-reduced-motion: reduce` escape — match that when adding motion, and
  note `html { scroll-behavior: smooth }` is inside a `prefers-reduced-motion: no-preference` guard.
- Accessibility patterns are deliberate throughout (`aria-expanded`/`aria-controls` on the nav and
  `aria-current` on links, `aria-hidden` on the decorative hero half, `:focus-visible`
  outlines, `role="status"` on form errors). Keep them when editing these components.

### Card entrance

`src/lib/stagger.ts` is shared by the Key Skills grid and the project cards. `staggerIn(cards)`
arms them (`is-armed`, which hides them) and gives each an `IntersectionObserver`; cards that cross
in the same callback are treated as a row and released by DOM order, 110ms apart. DOM order is left
to right at every breakpoint, so the column count never has to be worked out — which matters for
`CardList`, whose grid runs from one column to five. Scroll slowly and each row starts its own
count from zero.

The animation is `.float-in` in `global.css`: `card-rise` to fly in, then `card-drift`, six paths
and six clocks cycling by `:nth-child(6n + k)` so no two neighbours drift in step. **The two are
one `animation` shorthand on purpose** — both animate `transform`, the later entry wins, and the
drift's `calc(var(--stagger) + 620ms)` delay hands it over exactly as the entrance settles. Split
them across two rules and one silently clobbers the other.

A card opts in with `class="float-in"` plus a hook for the script to find it (`data-skill-card`,
`data-link-card`). There are two more entrances on the same machinery: `.rise-in`, the drift-free
variant the career timeline uses — a drifting entry would pull its dot off the rail — and
`.flip-in`, a `rotateY` swing from edge-on for the logo walls, whose `perspective()` sits inside the
transform so each logo turns about its own centre rather than sharing one vanishing point away at
the end of the row. Every caller gates on `motionAllowed()` (`src/lib/motion.ts`), and
both classes have a reduced-motion escape, so the content is simply there without JS.

`TechStack.astro` keeps its own entrance rather than borrowing one of those classes, because it
needs to animate colour as well as transform: each of the 33 chips arrives wearing its own `:hover`
state and settles out of it, so a wash of orange runs across the grid. **The fill modes are the
whole point there** — `chip-in` is `both`, to beat `.is-armed`'s opacity, but `chip-flash` is
`backwards`, because a finished animation outranks a normal rule and a `both` would leave every
chip permanently overriding its own `:hover`. With that many items the entrance is kept cheap: one
observer that drops each target as it lands, one-shot animations with nothing left running
afterwards, and a 40ms stagger so a whole screenful does not take seconds to arrive.

### Spin

`ProjectShot.astro` turns the case-study screenshot into a card that turns under the pointer, with
`src/lib/spin.ts` doing the maths and writing `--rx` / `--ry`. Its back carries the project's
description — which is why `PageHeading`'s `description` is optional and a project page leaves it
off, so turning the card over pays for itself.

Two modes. With a pointer (`hover: hover`) sweeping across the card turns it, the angle chasing the
cursor a tenth of the gap per frame; 170deg at the far edge means an edge-to-edge sweep carries it
past the back and out the other side, and leaving eases it flat. Touch has no hover, so it falls
back to `mode: 'drag'`: throw it and it carries on under friction, then settles on an exact multiple
of 180deg — flat on whichever face ended up toward you.

**Hover mode must measure the stage, not the card** (`surface`). A rotated element's
`getBoundingClientRect` is its *projected* box: at 136deg this card's rect shifts 174px and narrows
by 255px, so mapping the pointer against it feeds the rotation back into itself. The stage carries
`perspective`, not a transform, so it stays put.

It sways on its own until touched — a 12deg sweep on a 9s clock — so the card advertises itself
by moving rather than by the line of text underneath. That sway is **its own layer** between the
stage and the card: a CSS clock turns the wrapper, the pointer turns the card inside it, and the two
compose. Put both on one element and each overwrites the other's `transform`. `armSpin`'s `busy`
option marks the section while the card is under the hand or still coasting, which pauses the sway;
a paused animation resumes where it stopped, so nothing jumps when it settles.

Three more things are load-bearing. The card must **shrink-wrap the image** (`inline-block`, with the
95% cap on the stage rather than the image), because the back face is `inset: 0` and sizing the
image in percentages of the card leaves the two different widths. `backface-visibility: hidden` is
what lets a back face exist at all — without it the front shows through mirrored past square on.
And `touch-action: pan-y` — applied only in drag mode — keeps a vertical swipe a page scroll on a
phone while a sideways one spins, so the card cannot trap the reader mid-page.

The drag itself runs under `prefers-reduced-motion` — it is the visitor's own hand — while the
sway, the throw and the settle glide are all dropped. Arrow keys turn it 15deg a press for anyone not using a
pointer; `keydown` only claims the four arrows, so Tab still moves focus.

### Typewriter

`src/lib/typewriter.ts` types the `PageHeading` description in a character at a time with a caret
riding the end of it, kicked off by the same observer that wipes the title (260ms behind it, so the
title leads). It reuses the decrypt's two-layer trick — real text keeps the layout, a mask holds
what has been typed — which is what stops the paragraph growing line by line and shoving the page
down as it fills in, and it keeps the whole paragraph in the accessibility tree throughout.

Two details worth keeping. The mask holds one text node and one caret element, written to in place,
so a frame costs a `nodeValue` assignment rather than any DOM churn. And the caret carries
`margin-right: -2px` to cancel its own width — otherwise it is the thing that tips the word being
typed onto the next line, and the text jitters as it goes. Long paragraphs type *faster* rather than
longer (`MS_PER_CHAR` under a 2.2s cap).

### Text decrypt

`src/lib/scramble.ts` is the shared effect behind Key Skills and the hero. A target is marked up as
a `.scramble` wrapper holding `.scramble__real` (the actual text) and an `aria-hidden`
`.scramble__mask`; `armScramble(root)` ciphers every `[data-scramble]` inside `root` and toggles
`.is-ciphered` on it until they have all resolved. The rules live in `global.css`.

Two things are deliberate. The real text stays in the DOM and in the layout (`visibility`, not
`display`), so the cipher can never reflow a card, and screen readers and no-JS visitors always get
the real text. And the effect is *armed from JS* like `Reveal`/`PageHeading`, so
`prefers-reduced-motion` leaves everything readable.

`data-scramble="letters"` swaps the punctuation-heavy charset for a narrow lowercase one — the hero
needs it because Courgette is proportional and the full set ran a third wider than the real name.
Anything in `--font-mono` can use the default set, whose widths cannot vary.

### Contact form

`ContactForm.tsx` is wired for **Netlify Forms**: the hidden `form-name` input, `data-netlify`,
and the `bot-field` honeypot must stay for detection to work. It validates client-side, POSTs
url-encoded data to `/`, then redirects to `/success`. There is no `netlify.toml` in the repo.

### Environment

Copy `.env.example` to `.env`:

- `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ACCESS_TOKEN` — Content Delivery API credentials.
- `CONTENTFUL_PROJECT_TYPE_ID` — optional override, default `projects`.

`contentful.ts` reads `import.meta.env` first and falls back to `process.env`, so the same code works
inside Vite and in plain Node contexts.

Static assets (nav imagery, client logos, favicons) live in `public/` and are referenced by
absolute path. Mind the logo filenames in `public/logo/`: `gouldsonium-white.png` is a *black* mark
on a white background, and `-orange.png` is black on an orange that is not `--colour-accent`. Only
`gouldsonium-nobg.png` is transparent, which is why the footer uses it with `filter: brightness(0)`. `Layout.astro` hardcodes the `gouldsonium.com` OG image default, but `site` is **not**
set in `astro.config.mjs`, so canonical URLs fall back to the request URL.

## Note

`CLAUDE.md` and `AGENTS.md` are hard links to the same file. Edit it in place (e.g. `cat >`) so both
names stay in sync; replacing the file breaks the link.
