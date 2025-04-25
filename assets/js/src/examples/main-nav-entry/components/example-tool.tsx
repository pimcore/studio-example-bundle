import React from 'react'
import { Alert, Content } from '@pimcore/studio-ui-bundle/components'

const ExampleTool: React.FC = () => {
  return (
    <Content padded>
      <h1>Example Tool</h1>
      <Alert message="Just a quick demo how to open main widgets from the main navigation menu." />
    </Content>
  )
}

export default ExampleTool
