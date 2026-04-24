/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.{test,spec}.{ts,tsx}'],
    // Playwright e2e specs are picked up by `npm run test:e2e` (playwright runner).
    // Excluding them here prevents vitest from trying to run them as unit tests.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      'tests/e2e/**',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});