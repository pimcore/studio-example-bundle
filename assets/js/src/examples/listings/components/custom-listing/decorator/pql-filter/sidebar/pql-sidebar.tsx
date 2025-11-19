import React from 'react'
import { Content, ContentLayout, Header, Select } from '@pimcore/studio-ui-bundle/components'
import { usePqlFilterContext } from '../provider/pql-filter-provider'

export interface predefinedPqlFilter {
  label: string
  pql: string
}

export const PqlSidebar = (): React.JSX.Element => {
  const { pqlFilter, setPqlFilter } = usePqlFilterContext()
  const predefinedPqls: predefinedPqlFilter[] = [
    { label: 'All E-Type models which are green or produced before 1965.', pql: 'series = "E-Type" AND (color = "green" OR productionYear < 1965)' },
    { label: 'All Alfa cars produced after 1965', pql: 'manufacturer:Manufacturer.name = "Alfa" AND productionYear > 1965' },
    { label: 'All red or blue cars using standard PQL syntax.', pql: 'color = "red" OR color = "blue"' }
  ]

  const options = predefinedPqls.map((filter) => ({
    label: filter.label,
    value: filter.pql
  }))

  return (
    <ContentLayout>
      <Content padded>
        <Header title="Predefined PQL Filter" />

        <Select
          allowClear
          className="w-full"
          onChange={ setPqlFilter }
          options={ options }
          value={ pqlFilter }
        />
      </Content>
    </ContentLayout>
  )
}
