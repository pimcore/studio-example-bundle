import React, { useRef } from 'react'
import { DEFAULT_TALK_URL } from '../config'

export const TALK_WIDGET_NAME = 'talk-slides'

// The widget's props are the `config` of the main-nav entry's widgetConfig, so `url` can be set there.
interface TalkSlidesWidgetProps {
  url?: string
}

export const TalkSlidesWidget = (props: TalkSlidesWidgetProps): React.JSX.Element => {
  const { url = DEFAULT_TALK_URL } = props
  const frameRef = useRef<HTMLIFrameElement>(null)

  // Move keyboard focus into the viewer, so the slide keys (arrows, space) work without a click first.
  const onLoad = (): void => {
    frameRef.current?.focus()
    frameRef.current?.contentWindow?.focus()
  }

  return (
    <iframe
      onLoad={ onLoad }
      ref={ frameRef }
      src={ url }
      style={ { border: 'none', display: 'block', width: '100%', height: '100%' } }
      tabIndex={ 0 }
      title='Talk'
    />
  )
}
