import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'

const registerMainNavItem = jest.fn()
const registerWidget = jest.fn()

// Studio's SDK is a module-federation remote at runtime (jest can't resolve its paths, hence virtual); the tests replace it with the two registries they check.
jest.mock('@pimcore/studio-ui-bundle', () => ({
  container: {
    get: (id: string) => id === 'mainNavRegistry'
      ? { registerMainNavItem }
      // F38: the widget asks the theme registry for Studio's accent; this theme has none (see talk-slides-theme.test.tsx)
      : id === 'themeRegistry' ? { resolveMergedTheme: () => ({ token: {} }) } : { registerWidget }
  }
}), { virtual: true })
jest.mock('@pimcore/studio-ui-bundle/app', () => ({
  serviceIds: { mainNavRegistry: 'mainNavRegistry', widgetManager: 'widgetManager', 'DynamicTypes/ThemeRegistry': 'themeRegistry' },
  useAppSelector: (selector: (state: any) => unknown) => selector({ theme: { themeId: 'studio-default-light' } })
}), { virtual: true })
jest.mock('@pimcore/studio-ui-bundle/modules/app', () => ({
  selectThemeId: (state: any) => state.theme.themeId
}), { virtual: true })

/* eslint-disable import/first */
import { TalkSlidesPlugin } from '../index'
import { TalkSlidesExtension } from '../modules/talk-slides-extension'
import { TalkSlidesWidget, TALK_WIDGET_NAME } from '../components/talk-slides-widget'
import { DEFAULT_TALK_URL } from '../config'
/* eslint-enable import/first */

type StartupContext = Parameters<NonNullable<IAbstractPlugin['onStartup']>>[0]

describe('talk-slides example', () => {
  beforeEach(() => {
    registerMainNavItem.mockClear()
    registerWidget.mockClear()
  })

  it('AC1: loading the module registers the main-nav entry Talk and its widget', () => {
    const registerModule = jest.fn()
    TalkSlidesPlugin.onStartup?.({ moduleSystem: { registerModule } } as unknown as StartupContext)
    expect(registerModule).toHaveBeenCalledWith(TalkSlidesExtension)

    TalkSlidesExtension.onInit()

    const items = registerMainNavItem.mock.calls.map(call => call[0] as any)
    const entry = items.find(item => item.widgetConfig !== undefined)
    expect(entry.path).toBe('Talk')
    expect(entry.widgetConfig.name).toBe('Talk')
    expect(entry.widgetConfig.component).toBe(TALK_WIDGET_NAME)
    expect(entry.widgetConfig.config.url).toBe(DEFAULT_TALK_URL)

    expect(registerWidget).toHaveBeenCalledWith(expect.objectContaining({
      name: TALK_WIDGET_NAME,
      component: TalkSlidesWidget
    }))
  })

  it('AC2: the widget shows an iframe with /talk/talk.html by default', () => {
    expect(DEFAULT_TALK_URL).toBe('/talk/talk.html')
    render(<TalkSlidesWidget />)
    // F38: the viewer is told it is shown in Studio
    expect(screen.getByTitle('Talk').getAttribute('src')).toBe('/talk/talk.html?host=studio')
  })

  it('AC2: the widget shows an iframe with the configured URL', () => {
    render(<TalkSlidesWidget url='https://example.test/deck/talk.html' />)
    expect(screen.getByTitle('Talk').getAttribute('src')).toBe('https://example.test/deck/talk.html?host=studio')
  })

  it('AC3: once the iframe has loaded, keyboard focus moves into it', () => {
    render(<TalkSlidesWidget />)
    const frame = screen.getByTitle<HTMLIFrameElement>('Talk')
    // jsdom has no window.focus; the stub also shows the viewer's own window gets the focus
    const focusViewer = jest.fn()
    frame.contentWindow!.focus = focusViewer
    expect(document.activeElement).not.toBe(frame)
    fireEvent.load(frame)
    expect(document.activeElement).toBe(frame)
    expect(focusViewer).toHaveBeenCalled()
  })

  it('AC4: the example folder has a README that names the extension points used', () => {
    const readme = join(__dirname, '..', 'README.md')
    expect(existsSync(readme)).toBe(true)
    const text = readFileSync(readme, 'utf8')
    expect(text).toMatch(/MainNavRegistry/)
    expect(text).toMatch(/registerMainNavItem/)
    expect(text).toMatch(/WidgetRegistry/)
    expect(text).toMatch(/registerWidget/)
    expect(text).toMatch(/main-nav-entry/)
    expect(text).toMatch(/custom-widgets/)
  })
})
