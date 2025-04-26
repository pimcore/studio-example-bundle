import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { ApiDataExtension } from './modules/api-data-extension'

export const ApiDataPlugin: IAbstractPlugin = {
  name: 'ApiDataPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(ApiDataExtension)
  }
}
