/** Constitution VI (bounded contexts, inward layering) and VII (no junk drawers). */
const CONTEXT = '^src/contexts/([^/]+)/';

module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment: 'A domain layer may import only the shared kernel and its own domain.',
      severity: 'error',
      from: { path: `${CONTEXT}domain/` },
      to: { pathNot: ['^src/shared-kernel/', `^src/contexts/$1/domain/`] },
    },
    {
      name: 'application-inward',
      comment: 'Application may import its own domain/application and the shared kernel only.',
      severity: 'error',
      from: { path: `${CONTEXT}application/` },
      to: { pathNot: ['^src/shared-kernel/', `^src/contexts/$1/(domain|application)/`] },
    },
    {
      name: 'cross-context-via-barrel',
      comment: 'Another context may be imported only via its index.ts.',
      severity: 'error',
      from: { path: CONTEXT },
      to: { path: '^src/contexts/([^/]+)/.+', pathNot: ['^src/contexts/$1/', '^src/contexts/[^/]+/index\\.ts$'] },
    },
    {
      name: 'outside-uses-barrels',
      comment: 'Code outside the contexts reaches a context only through its index.ts.',
      severity: 'error',
      from: { pathNot: ['^src/contexts/', '^src/workers/'] },
      to: { path: '^src/contexts/[^/]+/.+', pathNot: '^src/contexts/[^/]+/index\\.ts$' },
    },
    {
      name: 'presentation-uses-app-only',
      severity: 'error',
      from: { path: '^src/presentation/' },
      to: { path: '^src/', pathNot: ['^src/presentation/', '^src/app/', '^src/shared-kernel/'] },
    },
    {
      name: 'shared-kernel-is-leaf',
      severity: 'error',
      from: { path: '^src/shared-kernel/' },
      to: { path: '^src/', pathNot: '^src/shared-kernel/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-junk-drawers',
      comment: 'Constitution VII: no utils/helpers/manager/misc modules.',
      severity: 'error',
      from: {},
      to: { path: '(^|/)(utils|helpers|manager|misc)(/|\\.[jt]sx?$)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js'] },
  },
};
