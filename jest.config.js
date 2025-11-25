module.exports = {
  // Using SWC for fast TypeScript transpilation instead of ts-jest (removes deprecated glob/inflight chain)
  // Using V8 coverage provider to avoid Istanbul dependencies (babel-plugin-istanbul -> test-exclude -> glob -> inflight)
  coverageProvider: 'v8',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
          },
        },
        module: {
          type: 'commonjs',
        },
        sourceMaps: 'inline',
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts', '!src/app.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  detectOpenHandles: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
