/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^../generated/prisma$': '<rootDir>/src/services/__mocks__/prisma.ts',
    '^./generated/prisma$': '<rootDir>/src/services/__mocks__/prisma.ts',
    '^../../generated/prisma$': '<rootDir>/src/services/__mocks__/prisma.ts',
  },
  clearMocks: true,
};
