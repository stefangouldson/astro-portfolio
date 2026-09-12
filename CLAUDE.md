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
the static replacement for what used to be a React accordion island.

`#career` is split across two bands — the heading and intro sit on `.primaryBG`,
then a `Worked At` logo band, then `CareerTimeline.astro` opens its own `.whiteBG .content` block,
so the timeline itself is dark text on white. Its entries come from `src/data/career.json` (`period` / `role` / optional `company` /
`summary` as an array of paragraphs / `tags`). The timeline alternates sides around one centre
rail drawn by `.timeline::before`, with `:nth-child` deciding which edge each entry's dot sits on;
below 900px it collapses to a single rail on the left.

The only other routes are `src/pages/projects/[slug].astro` (the Contentful case studies the project
cards link out to) and `src/pages/success.astro` (the contact form's redirect target). The old
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
  nothing to watch and the anchors fall back to real navigation.
- `Hero.tsx` — `client:load` (`index.astro`), pointer-tracking split reveal.
- `ContactForm.tsx` — `client:load` (`index.astro`).

### Styling conventions

- `src/styles/global.css` owns design tokens (`--colour-bg` `#222831`, `--colour-accent` `#ffa500`,
  the three font families, nav timings), the responsive type scale, and the shared `.button` /
  `.input` / `.contentful-content` / `.reveal-*` rules. It is imported once by `Layout.astro`.
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
  its own `Company[]` and a title — the markup, the white-logo `filter` and the hover are in
  `LogoWall`, so style changes land on both.
- `Footer.astro` is rendered by `Layout.astro` on every page, **outside `<main>`** so it stays the
  page's footer rather than main's content — which means `global.css` has to give it the same
  `.nav-open` transform as `<main>`, or the nav would open over a footer that had not moved. Its
  year is stamped at build time and corrected by an inline script, since a static build would
  otherwise freeze it until the next deploy.
- `Reveal.astro` wraps sections in a scroll-in animation. Its inline script *arms* the effect from
  JS (`.reveal-armed`), so without JS or with `prefers-reduced-motion` the content stays at full
  opacity. `PageHeading.astro` arms its title wipe the same way (`.is-armed` / `.is-wiping`), so the
  wipe fires when the section scrolls in rather than all four at once on load. Every animation in
  the codebase has a `prefers-reduced-motion: reduce` escape — match that when adding motion, and
  note `html { scroll-behavior: smooth }` is inside a `prefers-reduced-motion: no-preference` guard.
- Accessibility patterns are deliberate throughout (`aria-expanded`/`aria-controls` on the nav and
  `aria-current` on links, `aria-hidden` on the decorative hero half, `:focus-visible`
  outlines, `role="status"` on form errors). Keep them when editing these components.

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
