import { Content } from '@pimcore/studio-ui-bundle/components'
import React from 'react'

// Note: Many external sites set X-Frame-Options or
// Content-Security-Policy headers that block embedding
// via iframe. Use URLs you control or that explicitly
// allow framing (e.g. your own internal tools).

interface IframeWidgetProps {
  url?: string
  height?: number
}

export const IframeWidget = (props: IframeWidgetProps): React.JSX.Element => {
  const { url = '', height = 600 } = props

  if (url === '') {
    return (
      <Content padded>
        <div>No URL configured for this iframe widget.</div>
      </Content>
    )
  }

  return (
    <iframe
      height={ height }
      src={ url }
      style={ { border: 'none', width: '100%', height: '100%' } }
      title='Iframe Widget'
    />
  )
}
