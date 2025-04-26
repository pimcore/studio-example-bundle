import { Content, Header } from '@pimcore/studio-ui-bundle/components'
import React from 'react'
import { DataGrid } from './data-grid'

export const DynamicTypesWidget = (): React.JSX.Element => {
  return (
    <Content padded>
      <Header title="Dynamic types" />

      <DataGrid />
    </Content>
  )
}
