import React from 'react'
import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { Icon } from '@pimcore/studio-ui-bundle/components'
import { type TextTabManager } from '@pimcore/studio-ui-bundle/modules/asset'
import { CoasterReviewTab } from '../components/coaster-review-tab'
import { isCoasterAsset } from '../coaster-review-model'

// A .coaster file is JSON: Pimcore stores it as a text asset, or as unknown where its mime type isn't mapped.
const TAB_MANAGERS = ['Asset/Editor/TextTabManager', 'Asset/Editor/UnknownTabManager'] as const

/** The extension point: one asset editor tab "Review", shown on .coaster assets only. */
export const CoasterReviewTabExtension: AbstractModule = {
  onInit (): void {
    for (const serviceId of TAB_MANAGERS) {
      container.get<TextTabManager>(serviceIds[serviceId]).register({
        key: 'coaster-review',
        label: 'Review',
        icon: <Icon value="pimcore" />,
        children: <CoasterReviewTab />,
        hidden: (element) => !isCoasterAsset(element)
      })
    }
  }
}
