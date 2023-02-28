/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "/**/src/**/__test?(s)__/**/*.[jt]s?(x)",
    "/**/scripts/**/__test?(s)__/**/*.[jt]s?(x)",
    "/**/tests/**/?(*.)+(spec|test).[tj]s?(x)"
  ],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    "/node_modules/",
    "js-sdk/__mocks__/*",
    "build"
  ],
};