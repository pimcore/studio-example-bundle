import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { ApiDataWidget } from '../components/api-data-widget'

export const ApiDataExtension: AbstractModule = {
  onInit () {
    const mainNavRegistryService = container.get<MainNavRegistry>(serviceIds.mainNavRegistry)

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin/Api Data',
      widgetConfig: {
        name: 'Api Data',
        id: 'api-data',
        component: 'api-data-widget',
        config: {
          icon: {
            type: 'name',
            value: 'pimcore'
          }
        }
      }
    })

    const widgetRegistryService = container.get<WidgetRegistry>(serviceIds.widgetManager)
    widgetRegistryService.registerWidget({
      name: 'api-data-widget',
      component: ApiDataWidget
    })
  }
}
