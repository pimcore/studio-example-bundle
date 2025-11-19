import React from 'react'
import { type AbstractDecoratorProps } from '@pimcore/studio-ui-bundle/modules/element'
import { Icon } from '@pimcore/studio-ui-bundle/components'
import { PqlSidebar } from './sidebar/pql-sidebar'

export const withPqlFilterSidebar = (useBaseHook: AbstractDecoratorProps['useSidebarOptions']): AbstractDecoratorProps['useSidebarOptions'] => {
  const usePqlFilterSidebarOptions: AbstractDecoratorProps['useSidebarOptions'] = () => {
    const { getProps: baseGetProps } = useBaseHook()

    const getProps: ReturnType<AbstractDecoratorProps['useSidebarOptions']>['getProps'] = () => {
      const baseProps = baseGetProps()

      baseProps.entries.unshift({
        key: 'pql-filter',
        component: <PqlSidebar />,
        icon: <Icon value="pimcore" />
      })

      return baseProps
    }

    return {
      getProps
    }
  }

  return usePqlFilterSidebarOptions
}
