import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { AssetEditorToolbarButtonExtension } from './modules/asset-editor-toolbar-button-extension'

export const AssetEditorToolbarButtonPlugin: IAbstractPlugin = {
  name: 'AssetEditorToolbarButtonPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(AssetEditorToolbarButtonExtension)
  }
}
