import { ContentLayout, Header, Toolbar } from '@pimcore/studio-ui-bundle/components'
import { type AbstractDecoratorProps } from '@pimcore/studio-ui-bundle/modules/element'
import React from 'react'

export const withHeader = (BaseComponent: AbstractDecoratorProps['ViewComponent']): AbstractDecoratorProps['ViewComponent'] => {
  const HeaderComponent: AbstractDecoratorProps['ViewComponent'] = (props) => {
    return (
      <ContentLayout renderTopBar={
        <Toolbar
          position="top"
          theme="secondary"
        >
          <Header title="Cars" />
        </Toolbar>
      }
      >
        <BaseComponent />
      </ContentLayout>
    )
  }

  return HeaderComponent
}
