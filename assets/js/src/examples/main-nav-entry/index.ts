import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { MainNavEntryExtension } from './modules/main-nav-entry-extension'

export const MainNavEntryPlugin: IAbstractPlugin = {
  name: 'MainNavEntryPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(MainNavEntryExtension)
  }
}
