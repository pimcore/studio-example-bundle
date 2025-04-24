import { Box } from '@pimcore/studio-ui-bundle/components'
import React from 'react'

export const PreviewTab = (): React.JSX.Element => {
  return (
    <Box padding="small">
      <h1>New preview tab</h1>
      <p>This is a new preview tab.</p>
      <p>It replaces the default preview tab.</p>
    </Box>
  )
}
