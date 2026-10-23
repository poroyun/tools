import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://poroyun.github.io',
  base: '/tools',
  integrations: [sitemap()],
  devToolbar: {
    enabled: false,
  },
});
