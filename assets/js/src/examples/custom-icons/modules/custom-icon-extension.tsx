import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type IconLibrary } from '@pimcore/studio-ui-bundle/modules/icon-library'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { CustomIcons } from '../components/custom-icons'
import { Rocket } from '../icons/rocket'

export const CustomIconExtension: AbstractModule = {
  onInit (): void {
    const iconLibrary = container.get<IconLibrary>(serviceIds.iconLibrary)
    iconLibrary.register({
      name: 'rocket-example',
      component: Rocket
    })

    const mainNavRegistryService = container.get<MainNavRegistry>(serviceIds.mainNavRegistry)

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin/Custom Icons',
      widgetConfig: {
        name: 'Custom Icons',
        id: 'custom-icon',
        component: 'custom-icons',
        config: {
          icon: {
            type: 'name',
            value: 'rocket-example'
          }
        }
      }
    })

    const widgetRegistryService = container.get<WidgetRegistry>(serviceIds.widgetManager)
    widgetRegistryService.registerWidget({
      name: 'custom-icons',
      component: CustomIcons
    })
  }
}
