import React from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Grid, Flex, IconButton } from '@pimcore/studio-ui-bundle/components'
import {
  type GDPRProviderTabProps,
  ExportButton
} from '@pimcore/studio-ui-bundle/modules/gdpr-data-extractor'

interface MyProviderRow {
  data: {
    id: number
    name: string
    lastname: string
    __gdprIsDeletable: boolean
  }
}

type TableRow = MyProviderRow['data'] & {
  actions: React.JSX.Element
}

export interface MyProviderTabProps extends GDPRProviderTabProps<MyProviderRow> {}

export const MyProviderTab = (
  { data, providerKey, refresh, onSortingChange, ...gridProps }: MyProviderTabProps
): React.JSX.Element => {
  const columnHelper = createColumnHelper<TableRow>()
  const columns = [
    columnHelper.accessor('id', {
      header: 'ID',
      size: 80
    }),
    columnHelper.accessor('name', {
      header: 'Name'
    }),
    columnHelper.accessor('lastname', {
      header: 'LastName'
    }),
    columnHelper.accessor('actions', {
      header: 'Actions',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => {
        const item = row.original
        return (
          <Flex>
            <ExportButton
              id={ item.id }
              providerKey={ providerKey }
              tooltip={ { title: 'Export' } }
            />
            { item.__gdprIsDeletable && (
              <IconButton
                icon={ { value: 'trash' } }
                onClick={ () => {
                  refresh?.()
                } }
                tooltip={ { title: 'Delete' } }
              />
            )}
          </Flex>
        )
      }
    })
  ]

  return (
    <Grid
      autoWidth
      columns={ columns }
      data={ data.map((item) => item.data) }
      enableSorting
      { ...gridProps }
    />
  )
}
