/**
 * Separate Jest config for API route tests
 * Uses Node.js environment instead of jsdom to avoid Request polyfill conflicts
 */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node', // Use Node.js environment for API tests
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@__test-utils__/(.*)$': '<rootDir>/__test-utils__/$1',
    '^@test-utils/(.*)$': '<rootDir>/__test-utils__/$1',
  },
  testMatch: [
    '**/__tests__/api/**/*.test.ts',
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  collectCoverageFrom: [
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
  testTimeout: 10000,
};

module.exports = createJestConfig(customJestConfig);

