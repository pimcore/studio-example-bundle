import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type DynamicTypeThemeRegistry } from '@pimcore/studio-ui-bundle/modules/app'

export const CustomThemeExtension: AbstractModule = {
  onInit: (): void => {
    const themeRegistry = container.get<DynamicTypeThemeRegistry>(serviceIds['DynamicTypes/ThemeRegistry'])

    themeRegistry.registerDynamicType(container.get('DynamicTypes/Theme/ExampleOcean'))
  }
}
