import { Alert, Content, Header } from '@pimcore/studio-ui-bundle/components'
import React from 'react'

export const PreviewTab = (): React.JSX.Element => {
  return (
    <Content padded>
      <Header title="New preview tab" />
      <Alert
        message={ (
          <div>
            This is a new preview tab.<br />
            It replaces the default preview tab.
          </div>
      ) }
        type="info"
      />
    </Content>
  )
}
