import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { type DynamicTypeWidgetTypeRegistry } from '@pimcore/studio-ui-bundle/modules/widget-editor'
import { ExampleWidget } from '../components/example-widget'
import { AnotherExampleWidget } from '../components/another-example-widget'
import { IframeWidget } from '../components/iframe-widget'

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

    widgetRegistryService.registerWidget({
      name: 'example_iframe',
      component: IframeWidget
    })

    const widgetTypeRegistry = container.get<DynamicTypeWidgetTypeRegistry>(
      serviceIds['DynamicTypes/WidgetEditor/WidgetTypeRegistry']
    )
    widgetTypeRegistry.registerDynamicType(
      container.get('DynamicTypes/WidgetEditor/WidgetType/ExampleIframe')
    )
  }
}
