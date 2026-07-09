import React, { useMemo } from 'react'
import { Flex, Grid } from '@pimcore/studio-ui-bundle/components'
import { createColumnHelper } from '@tanstack/react-table'
import { type ITopAssetEntry, type ITopAssetsData } from '../types'

/**
 * "Top Assets" dashboard widget component.
 *
 * Renders the most recently modified assets as a table. Data is fetched by the
 * generic dashboards widget renderer (backend `TopAssetsResolver`) and passed in
 * via `content`; this component only renders it.
 */

interface ITopAssetsWidgetProps {
  content: { data?: ITopAssetsData }
}

const EMPTY_DATA: ITopAssetsData = {
  items: []
}

export const TopAssetsWidget = ({ content }: ITopAssetsWidgetProps): React.JSX.Element => {
  const columnHelper = createColumnHelper<ITopAssetEntry>()

  const result = content?.data ?? EMPTY_DATA

  const columns = useMemo(() => [
    columnHelper.accessor('fullPath', {
      header: 'Path',
      meta: { type: 'text', editable: false },
      size: 260
    }),
    columnHelper.accessor('modificationDate', {
      header: 'Modified',
      cell: ({ row }) => (
        <span>
          {new Date(row.original.modificationDate * 1000).toLocaleString()}
        </span>
      ),
      meta: { type: 'text', editable: false },
      size: 140
    })
  ], [])

  if (result.items.length === 0) {
    return (
      <Flex
        align='center'
        justify='center'
        style={ { height: '100%' } }
      >
        No assets found
      </Flex>
    )
  }

  return (
    <Grid
      autoWidth
      columns={ columns }
      data={ result.items }
      resizable
      setRowId={ (row: ITopAssetEntry) => String(row.id) }
    />
  )
}
