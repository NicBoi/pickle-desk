import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// In production (GitHub Pages) the app is served from /pickle-desk/.
// In dev we serve from /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pickle-desk/' : '/',
  plugins: [svelte()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    globals: false,
  },
}));
