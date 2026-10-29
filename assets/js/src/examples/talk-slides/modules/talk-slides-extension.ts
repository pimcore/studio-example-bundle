import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { TalkSlidesWidget, TALK_WIDGET_NAME } from '../components/talk-slides-widget'
import { DEFAULT_TALK_URL } from '../config'

export const TalkSlidesExtension: AbstractModule = {
  onInit: (): void => {
    const mainNavRegistryService = container.get<MainNavRegistry>(serviceIds.mainNavRegistry)

    mainNavRegistryService.registerMainNavItem({
      path: 'Talk',
      icon: 'pimcore',
      widgetConfig: {
        name: 'Talk',
        id: 'talk-slides',
        component: TALK_WIDGET_NAME,
        config: {
          icon: {
            type: 'name',
            value: 'pimcore'
          },
          url: DEFAULT_TALK_URL
        }
      }
    })

    const widgetRegistryService = container.get<WidgetRegistry>(serviceIds.widgetManager)
    widgetRegistryService.registerWidget({
      name: TALK_WIDGET_NAME,
      component: TalkSlidesWidget
    })
  }
}
