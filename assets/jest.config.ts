import { pathsToModuleNameMapper, JestConfigWithTsJest } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [
    "@testing-library/jest-dom",
    "./js/test-utils/jest-setup.ts"
  ],
  moduleNameMapper: {
    '^@Pimcore/(.*)$': '<rootDir>/js/src/$1',
    '^@test-utils/(.*)$': '<rootDir>/js/test-utils/$1'
  },
};

export default config
