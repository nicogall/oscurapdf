import { defineConfig } from 'vitest/config';
import { aliases } from './vite.config.ts';

/**
 * Constitution V coverage thresholds:
 * - domain layers: ≥95% lines / ≥90% branches
 * - everything else under src/: ≥85% lines / ≥80% branches
 */
export default defineConfig({
  resolve: { alias: aliases },
  test: {
    projects: [
      {
        resolve: { alias: aliases },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts', 'tools/**/*.test.{ts,js}'],
          environment: 'node',
        },
      },
      {
        resolve: { alias: aliases },
        test: {
          name: 'unit-dom',
          include: ['tests/unit/**/*.test.tsx'],
          environment: 'happy-dom',
          setupFiles: ['tests/support/setup-dom.ts'],
        },
      },
      {
        resolve: { alias: aliases },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // Type-only modules and entry points exercised by e2e (justified in plan.md Complexity Tracking).
        'src/**/*.d.ts',
        'src/presentation/main.tsx',
        'src/workers/*.worker.ts',
        'src/service-worker/sw.ts',
        'src/app/composition-root.ts',
        'src/app/composition-root.e2e-fault.ts',
      ],
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        lines: 85,
        branches: 80,
        'src/contexts/*/domain/**': { lines: 95, branches: 90 },
        'src/shared-kernel/**': { lines: 95, branches: 90 },
      },
    },
  },
});
