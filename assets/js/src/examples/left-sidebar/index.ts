import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { LeftSidebarExtension } from './modules/left-sidebar-extension'

export const LeftSidebarPlugin: IAbstractPlugin = {
  name: 'LeftSidebarPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(LeftSidebarExtension)
  }
}
