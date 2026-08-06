import { defineConfig } from 'crap4ts';

export default defineConfig({
  // Source dirs analyzed for cyclomatic complexity.
  src: ['domains', 'services', 'lib', 'pages'],
  // Coverage (coverage/coverage-final.json from `pnpm test:coverage`) is passed
  // via the `--coverage` CLI flag in the package.json `crap` scripts.
  // CRAP threshold. 16 flags e.g. an untested function of complexity ~4+.
  // Use `--strict` (8) on the CLI to tighten.
  threshold: 16,
  coverageMetric: 'line',
  exclude: ['**/*.test.*', '**/*.spec.*', '**/*.d.ts'],
  sort: 'crap',
});
