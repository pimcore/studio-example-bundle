import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'

// F38: the Studio tab tells the viewer it is shown in Studio and passes the active theme's accent (colorPrimary),
// so the slides take Studio's colour; the standalone talk.html keeps its neutral theme.
const resolveMergedTheme = jest.fn<(id: string) => { token?: Record<string, unknown> }>()

jest.mock('@pimcore/studio-ui-bundle', () => ({
  container: {
    get: (id: string) => id === 'themeRegistry' ? { resolveMergedTheme } : {}
  }
}), { virtual: true })
jest.mock('@pimcore/studio-ui-bundle/app', () => ({
  serviceIds: { 'DynamicTypes/ThemeRegistry': 'themeRegistry' },
  useAppSelector: (selector: (state: any) => unknown) => selector({ theme: { themeId: 'studio-default-light' } })
}), { virtual: true })
jest.mock('@pimcore/studio-ui-bundle/modules/app', () => ({
  selectThemeId: (state: any) => state.theme.themeId
}), { virtual: true })

/* eslint-disable import/first */
import { TalkSlidesWidget } from '../components/talk-slides-widget'
import { talkUrl } from '../config'
/* eslint-enable import/first */

describe('talk-slides theme (F38)', () => {
  beforeEach(() => {
    resolveMergedTheme.mockReset()
  })

  it('AC2: in the Studio tab the viewer URL names the host studio and the active theme accent', () => {
    resolveMergedTheme.mockReturnValue({ token: { colorPrimary: '#722ed1' } })
    render(<TalkSlidesWidget />)
    expect(resolveMergedTheme).toHaveBeenCalledWith('studio-default-light')
    expect(screen.getByTitle('Talk').getAttribute('src')).toBe('/talk/talk.html?host=studio&accent=%23722ed1')
  })

  it('AC2: a configured URL keeps its own query and slide hash next to host and accent', () => {
    resolveMergedTheme.mockReturnValue({ token: { colorPrimary: 'rgb(0, 89, 94)' } })
    render(<TalkSlidesWidget url='https://example.test/deck/talk.html?v=2#5' />)
    expect(screen.getByTitle('Talk').getAttribute('src'))
      .toBe('https://example.test/deck/talk.html?v=2&host=studio&accent=rgb%280%2C+89%2C+94%29#5')
  })

  it('AC2: without a theme accent the Studio tab still names the host, and a broken theme does not break the tab', () => {
    resolveMergedTheme.mockReturnValue({ token: {} })
    const { unmount } = render(<TalkSlidesWidget />)
    expect(screen.getByTitle('Talk').getAttribute('src')).toBe('/talk/talk.html?host=studio')
    unmount()

    resolveMergedTheme.mockImplementation(() => { throw new Error('Theme not found: x') })
    render(<TalkSlidesWidget />)
    expect(screen.getByTitle('Talk').getAttribute('src')).toBe('/talk/talk.html?host=studio')
  })

  it('AC2: talkUrl adds host and accent to the viewer URL and replaces ones already there', () => {
    expect(talkUrl('/talk/talk.html', 'portal', '#2B0080')).toBe('/talk/talk.html?host=portal&accent=%232B0080')
    expect(talkUrl('/talk/talk.html?host=x&accent=y&v=1', 'studio')).toBe('/talk/talk.html?v=1&host=studio')
    expect(talkUrl('talk.html#3', 'studio', '#123456')).toBe('talk.html?host=studio&accent=%23123456#3')
  })
})

describe('talk-slides README (F38)', () => {
  it('AC2: the README says the tab passes Studio accent to the viewer', () => {
    const text = readFileSync(join(__dirname, '..', 'README.md'), 'utf8')
    expect(text).toMatch(/host=studio/)
    expect(text).toMatch(/colorPrimary/)
    expect(text).toMatch(/resolveMergedTheme/)
  })
})
