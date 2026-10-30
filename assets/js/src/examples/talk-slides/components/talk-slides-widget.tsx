import React, { useMemo, useRef } from 'react'
import { container } from '@pimcore/studio-ui-bundle'
import { serviceIds, useAppSelector } from '@pimcore/studio-ui-bundle/app'
import { type DynamicTypeThemeRegistry, selectThemeId } from '@pimcore/studio-ui-bundle/modules/app'
import { DEFAULT_TALK_URL, talkUrl } from '../config'

export const TALK_WIDGET_NAME = 'talk-slides'

// The widget's props are the `config` of the main-nav entry's widgetConfig, so `url` can be set there.
interface TalkSlidesWidgetProps {
  url?: string
}

// Studio's accent: the colorPrimary of the active theme, with what it inherits from its parent themes.
const studioAccent = (themeId: string): string | undefined => {
  try {
    const registry = container.get<DynamicTypeThemeRegistry>(serviceIds['DynamicTypes/ThemeRegistry'])
    const accent = registry.resolveMergedTheme(themeId).token?.colorPrimary
    return typeof accent === 'string' ? accent : undefined
  } catch {
    // a theme that cannot be resolved: the slides keep their neutral default
    return undefined
  }
}

export const TalkSlidesWidget = (props: TalkSlidesWidgetProps): React.JSX.Element => {
  const { url = DEFAULT_TALK_URL } = props
  const frameRef = useRef<HTMLIFrameElement>(null)
  // The viewer is told it is shown in Studio and takes Studio's accent; switching the theme reloads it in the new one.
  const themeId = useAppSelector(selectThemeId)
  const src = useMemo(() => talkUrl(url, 'studio', studioAccent(themeId)), [url, themeId])

  // Move keyboard focus into the viewer, so the slide keys (arrows, space) work without a click first.
  const onLoad = (): void => {
    frameRef.current?.focus()
    frameRef.current?.contentWindow?.focus()
  }

  return (
    <iframe
      onLoad={ onLoad }
      ref={ frameRef }
      src={ src }
      style={ { border: 'none', display: 'block', width: '100%', height: '100%' } }
      tabIndex={ 0 }
      title='Talk'
    />
  )
}
