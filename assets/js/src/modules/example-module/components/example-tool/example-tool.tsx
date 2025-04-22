import React from 'react'
import { Box, Alert } from '@pimcore/studio-ui-bundle/components'

const ExampleTool: React.FC = () => {
  return (
    <Box padding="small">
      <h1>Example Tool</h1>
      <Alert message="Just a quick demo how to open main widgets from the main navigation menu." />
    </Box>
  )
}

export default ExampleTool
