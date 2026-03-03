import { defineConfig } from 'vite';

export default defineConfig({
  base: '/con-your-way/',
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
  },
});
