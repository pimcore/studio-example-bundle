import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { ExampleWidget } from '../components/example-widget'
import { AnotherExampleWidget } from '../components/another-example-widget'

export const CustomWidgetsExtension: AbstractModule = {
  onInit: (): void => {
    const mainNavRegistryService = container.get<MainNavRegistry>(serviceIds.mainNavRegistry)

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin/Custom Widgets',
      widgetConfig: {
        name: 'Custom Widgets',
        id: 'custom-widgets',
        component: 'example-widget',
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
      name: 'example-widget',
      component: ExampleWidget
    })

    widgetRegistryService.registerWidget({
      name: 'another-example-widget',
      component: AnotherExampleWidget
    })
  }
}
