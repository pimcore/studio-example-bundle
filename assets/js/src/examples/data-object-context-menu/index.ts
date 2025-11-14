import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DataObjectContextMenuExtension } from './modules/data-object-context-menu-extension'

export const DataObjectContextMenuPlugin: IAbstractPlugin = {
  name: 'DataObjectContextMenuPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(DataObjectContextMenuExtension)
  }
}
