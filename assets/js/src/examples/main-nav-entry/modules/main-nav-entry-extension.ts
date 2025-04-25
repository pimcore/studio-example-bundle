import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import ExampleTool from '../components/example-tool'

export const MainNavEntryExtension: AbstractModule = {
  onInit: (): void => {
    const mainNavRegistryService = container.get<MainNavRegistry>(serviceIds.mainNavRegistry)

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin',
      icon: 'pimcore'
    })

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin/Example Tool',
      widgetConfig: {
        name: 'Example Tool',
        id: 'example-tool',
        component: 'example-tool',
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
      name: 'example-tool',
      component: ExampleTool
    })
  }
}
