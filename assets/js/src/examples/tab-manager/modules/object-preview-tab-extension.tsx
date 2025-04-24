import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type ObjectTabManager } from '@pimcore/studio-ui-bundle/modules/data-object'
import React from 'react'
import { PreviewTab } from '../components/preview-tab'

export const ObjectPreviewExtension: AbstractModule = {
  onInit (): void {
    const objectTabManager = container.get<ObjectTabManager>(serviceIds['DataObject/Editor/ObjectTabManager'])
    const previewTab = objectTabManager.getTab('preview')

    if (previewTab === undefined) {
      throw new Error('Preview tab not found')
    }

    objectTabManager.register({
      ...previewTab,
      children: <PreviewTab />
    })
  }
}
