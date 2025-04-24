import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { AssetFolderTabExtension } from './modules/asset-folder-tab-exentsion'
import { ObjectPreviewExtension } from './modules/object-preview-tab-extension'

export const TabManagerPlugin: IAbstractPlugin = {
  name: 'TabManagerPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(AssetFolderTabExtension)
    moduleSystem.registerModule(ObjectPreviewExtension)
  }
}
