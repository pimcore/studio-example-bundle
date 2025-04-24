import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { Icon } from '@pimcore/studio-ui-bundle/components'
import { type FolderTabManager } from '@pimcore/studio-ui-bundle/modules/asset'
import { ExampleTab } from '../components/example-tab'
import React from 'react'

export const AssetFolderTabExtension: AbstractModule = {
  onInit (): void {
    const folderTabManager = container.get<FolderTabManager>(serviceIds['Asset/Editor/FolderTabManager'])

    folderTabManager.register({
      key: 'example-folder-tab',
      label: 'Example Folder Tab',
      icon: <Icon value="pimcore" />,
      children: <ExampleTab />
    })
  }
}
