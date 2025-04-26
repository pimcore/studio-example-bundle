import { Grid } from '@pimcore/studio-ui-bundle/components'
import React from 'react'

type GridProps = Parameters<typeof Grid>
const columns: GridProps[0]['columns'] = [
  {
    id: 'number-cell',
    accessorFn: (row) => row['number-cell'],
    accessorKey: 'number-cell',
    header: 'Number',
    meta: {
      type: 'number'
    }
  },

  {
    id: 'text-cell',
    accessorFn: (row) => row['text-cell'],
    accessorKey: 'text-cell',
    header: 'Text',
    meta: {
      type: 'text'
    }
  },

  {
    id: 'boolean-cell',
    accessorFn: (row) => row['boolean-cell'],
    accessorKey: 'boolean-cell',
    header: 'Boolean',
    meta: {
      type: 'boolean',
      editable: false
    }
  },

  {
    id: 'live-updating',
    accessorFn: (row) => row['live-updating'],
    accessorKey: 'live-updating',
    header: 'Live Updating',
    meta: {
      type: 'live-updating'
    }
  }
]

const data: GridProps[0]['data'] = [
  {
    'number-cell': 1,
    'text-cell': 'Hello',
    'live-updating': '2234',
    'boolean-cell': true
  },
  {
    'number-cell': 2,
    'text-cell': 'World',
    'live-updating': '543',
    'boolean-cell': false
  },
  {
    'number-cell': 3,
    'text-cell': '!',
    'live-updating': '234',
    'boolean-cell': true
  }
]

export const DataGrid = (): React.JSX.Element => {
  return (
    <Grid
      columns={ columns }
      data={ data }
    />
  )
}
