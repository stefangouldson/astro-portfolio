// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  // The site is one page now; keep the old routes pointing at their section.
  redirects: {
    '/about': '/#about',
    '/projects': '/#projects',
    '/contact': '/#contact',
  },
});