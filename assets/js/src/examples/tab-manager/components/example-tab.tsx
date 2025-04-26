import { Content, Header } from '@pimcore/studio-ui-bundle/components'
import React from 'react'

export const ExampleTab = (): React.JSX.Element => {
  return (
    <Content padded>
      <Header title="Example Tab" />
      This is an example tab.
    </Content>
  )
}
