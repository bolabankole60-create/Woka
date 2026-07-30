module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/app'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      isolatedModules: true,
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/src/**/*.test.ts', '**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/app/'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/index.ts',
  ],
};
