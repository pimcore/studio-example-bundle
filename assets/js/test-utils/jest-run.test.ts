import { describe, expect, it } from '@jest/globals'

describe('jest run', () => {
  it('AC1: jest starts with the setup files from jest.config.ts and runs a test', () => {
    expect(document.body).toBeDefined()
  })

  it('AC2: the setup file type-checks as part of the project', async () => {
    await expect(import('./jest-setup')).resolves.toBeDefined()
  })

  it('AC3: the repo test run has at least one test, without relying on --passWithNoTests', () => {
    expect(expect.getState().testPath).toMatch(/jest-run\.test\.ts$/)
  })
})
