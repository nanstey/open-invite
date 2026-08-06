import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      // `json` emits coverage/coverage-final.json, which the CRAP tool
      // (automation/crap) consumes for per-function coverage.
      reporter: ['text', 'json'],
      reportsDirectory: './coverage',
      include: ['domains/**', 'services/**', 'lib/**', 'pages/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/*.d.ts'],
      // Include files that are never imported by a test so untested source
      // shows up at 0% coverage rather than vanishing from the report.
      all: true,
    },
  },
});
