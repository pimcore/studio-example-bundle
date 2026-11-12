import { pathsToModuleNameMapper, JestConfigWithTsJest } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  // Transpile only: a type-checking ts-jest worker needs ~2.7 GB, and four of them got the suite killed out of memory
  // (F70). Types are still checked by `npm run check-types` (tsc over the same js/**), which runs before jest.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }]
  },
  // At most two jsdom workers at once, so the suite fits next to other runs on a shared machine (F70).
  maxWorkers: 2,
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
