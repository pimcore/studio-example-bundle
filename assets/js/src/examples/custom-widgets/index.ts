import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { CustomWidgetsExtension } from './modules/custom-widgets-extension'

export const CustomWidgetsPlugin: IAbstractPlugin = {
  name: 'CustomWidgetsPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(CustomWidgetsExtension)
  }
}
