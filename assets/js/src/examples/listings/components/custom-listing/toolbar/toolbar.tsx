import React from 'react'
import { Toolbar as BaseToolbar, Flex } from '@pimcore/studio-ui-bundle/components'
import { SlotRenderer } from '@pimcore/studio-ui-bundle/modules/app'

export const Toolbar = (): React.JSX.Element => {
  return (
    <BaseToolbar theme="secondary">
      <Flex gap="small">
        <SlotRenderer slot="carsListing.toolbar.left" />
      </Flex>

      <Flex gap="small">
        <SlotRenderer slot="carsListing.toolbar.right" />
      </Flex>
    </BaseToolbar>
  )
}
