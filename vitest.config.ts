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
    // Route handlers build Supabase clients at call time and throw
    // "Missing Supabase admin credentials" without these, failing before they
    // reach anything worth asserting. Inert placeholders — every Supabase call
    // is mocked; these only get the client past its constructor.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      OPENAI_API_KEY: 'test-openai-key',
      // Dream text is encrypted before it is stored, so the submit handler
      // needs a real key shape: base64 that decodes to exactly 32 bytes. This
      // one is fixed and public on purpose — it exists only so AES-GCM can be
      // constructed in tests, and it never touches real data.
      DREAM_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    },
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