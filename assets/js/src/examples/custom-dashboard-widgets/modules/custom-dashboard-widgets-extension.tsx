import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import {
  TOP_ASSETS_WIDGET_SERVICE_ID,
  WIDGET_TYPE_REGISTRY_SERVICE_ID,
  type IDynamicTypeWidgetTypeDefinition,
  type IWidgetTypeRegistry
} from '../types'

export const CustomDashboardWidgetsExtension: AbstractModule = {
  onInit: (): void => {
    // The registry is only bound when the Studio Dashboards Bundle is installed.
    if (!container.isBound(WIDGET_TYPE_REGISTRY_SERVICE_ID)) {
      return
    }

    const widgetTypeRegistry = container.get<IWidgetTypeRegistry>(WIDGET_TYPE_REGISTRY_SERVICE_ID)
    widgetTypeRegistry.registerDynamicType(
      container.get<IDynamicTypeWidgetTypeDefinition>(TOP_ASSETS_WIDGET_SERVICE_ID)
    )
  }
}
