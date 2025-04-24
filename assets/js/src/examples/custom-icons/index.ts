import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { CustomIconExtension } from './modules/custom-icon-extension'

export const CustomIconPlugin: IAbstractPlugin = {
  name: 'CustomIconPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(CustomIconExtension)
  }
}
