const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^jose$': '<rootDir>/node_modules/jose/dist/node/cjs/index.js',
    // jsdom's test environment forces the `browser` package.json export
    // condition, which for jspdf resolves to its ESM bundle (jspdf.es.min.js)
    // — Jest's CJS-by-default runtime can't require() that without a real
    // ESM pipeline. Force the `node` build, which is plain CommonJS. Same
    // root cause and same fix pattern as the `jose` entry above.
    '^jspdf$': '<rootDir>/node_modules/jspdf/dist/jspdf.node.min.js',
  },
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx}',
    'app/api/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/.next-prod/**',
    '!**/coverage/**',
    '!**/dist/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.next/', '/.next-prod/'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/.next-prod/',
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/.next-prod/'],
  transformIgnorePatterns: ['node_modules/(?!(jose|uuid)/)', '^.+\\.module\\.(css|sass|scss)$'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
      },
    },
  },
};

module.exports = createJestConfig(customJestConfig);
