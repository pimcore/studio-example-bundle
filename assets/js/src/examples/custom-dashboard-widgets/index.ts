import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { CustomDashboardWidgetsExtension } from './modules/custom-dashboard-widgets-extension'
import { DynamicTypeWidgetTypeTopAssets } from './dynamic-types/definitions/dynamic-type-widget-type-top-assets'
import { TOP_ASSETS_WIDGET_SERVICE_ID } from './types'

export const CustomDashboardWidgetsPlugin: IAbstractPlugin = {
  name: 'CustomDashboardWidgetsPlugin',

  onInit ({ container }) {
    container.bind(TOP_ASSETS_WIDGET_SERVICE_ID).to(DynamicTypeWidgetTypeTopAssets)
  },

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(CustomDashboardWidgetsExtension)
  }
}
