import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { CustomWidgetsExtension } from './modules/custom-widgets-extension'
import { DynamicTypeWidgetTypeIframe } from './dynamic-types/definitions/dynamic-type-widget-type-iframe'

export const CustomWidgetsPlugin: IAbstractPlugin = {
  name: 'CustomWidgetsPlugin',

  onInit ({ container }) {
    container.bind('DynamicTypes/WidgetEditor/WidgetType/ExampleIframe').to(DynamicTypeWidgetTypeIframe)
  },

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(CustomWidgetsExtension)
  }
}
