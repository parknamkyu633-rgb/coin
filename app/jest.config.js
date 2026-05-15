/** @type {import('jest').Config} */
module.exports = {
  // Pure TS tests: use ts-jest directly to bypass expo's babel-preset (reanimated plugin issues)
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    // Mock native modules not available in Node.js test env
    '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.js',
    '^expo-crypto$': '<rootDir>/src/__mocks__/expo-crypto.js',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.js',
    '^@testing-library/react-native$': '<rootDir>/src/__mocks__/testing-library.js',
  },
  clearMocks: true,
};
