# Gouldsonium

My personal portfolio — [gouldsonium.com](https://gouldsonium.com).

A statically built one-page site: a split-reveal hero, an about section, a career timeline,
project work pulled from Contentful, and a contact form. The nav is a full-width card bar that
slides up from the bottom and smooth-scrolls between sections rather than navigating.

## Stack

- [Astro](https://astro.build) — static output, no server runtime
- React islands for the three pieces that need JavaScript (nav, hero, contact form); everything
  else ships zero JS
- [Contentful](https://www.contentful.com) as the CMS, queried at **build time**, so publishing
  content requires a rebuild
- [Netlify Forms](https://docs.netlify.com/forms/setup/) for contact submissions

## Getting started

Requires Node >= 22.12.0.

```sh
npm install
cp .env.example .env   # then fill in the Contentful credentials
npm run dev
```

| Command | Action |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Static build to `./dist/` |
| `npm run preview` | Serve the built output |

Without Contentful credentials the site still builds — the project list simply comes back empty
rather than failing.

## Layout

```text
src/
├── components/   # content, home, layout and ui components
├── data/         # career history, skills and tech stack as JSON
├── layouts/      # the shared page shell
├── lib/          # Contentful client and rich-text renderer
├── pages/        # index.astro plus the project detail route
└── styles/       # global tokens, type scale and shared classes
```

`AGENTS.md` (hard-linked as `CLAUDE.md`) documents the architecture in more depth.
