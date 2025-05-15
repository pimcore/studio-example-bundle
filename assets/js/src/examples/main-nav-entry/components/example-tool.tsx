import React from 'react'
import { Alert, Content, Header, Button } from '@pimcore/studio-ui-bundle/components'

const ExampleTool: React.FC = () => {
  return (
    <Content padded>
      <Header title='Example Tool' />
      <Alert message="Just a quick demo how to open main widgets from the main navigation menu." />
      <Button>test</Button>
    </Content>
  )
}

export default ExampleTool
