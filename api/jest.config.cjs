module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  testMatch: ['<rootDir>/src/tests/**/*.test.js'],
  clearMocks: true,
};
