import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Після підключення домену впишіть його сюди (потрібно для прев'ю посилань у соцмережах).
export default defineConfig({
  site: 'https://zhenya-bychkova.r-kharuzina.workers.dev',
  trailingSlash: 'ignore',
  integrations: [react()],
});
