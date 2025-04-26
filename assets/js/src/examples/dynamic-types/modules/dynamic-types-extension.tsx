import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { DynamicTypesWidget } from '../components/dynamic-types-widget'
import { type DynamicTypeGridCellRegistry } from '@pimcore/studio-ui-bundle/modules/element'

export const DynamicTypeExtension: AbstractModule = {
  onInit: (): void => {
    const mainNavRegistryService = container.get<MainNavRegistry>(serviceIds.mainNavRegistry)

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin/Dynamic Types',
      widgetConfig: {
        name: 'Dynamic Types',
        id: 'dynamic-types',
        component: 'dynamic-types',
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
      name: 'dynamic-types',
      component: DynamicTypesWidget
    })

    const gridCellRegistry = container.get<DynamicTypeGridCellRegistry>(serviceIds['DynamicTypes/GridCellRegistry'])

    gridCellRegistry.registerDynamicType(container.get('DynamicTypes/GridCell/LiveUpdatingCell'))
  }
}
