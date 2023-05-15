const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["/**/src/**/__test?(s)__/**/*.[jt]s?(x)", "/**/scripts/**/__test?(s)__/**/*.[jt]s?(x)", "/**/tests/**/?(*.)+(spec|test).[tj]s?(x)"],
  moduleNameMapper: { ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "src/" }), "arbundles/node": "arbundles/build/node/cjs/index.js" },
  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: ["/node_modules/", "build"],
};
