import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { CustomThemeExtension } from './modules/custom-theme-extension'
import { DynamicTypeThemeExampleOcean } from './dynamic-types/definitions/dynamic-type-theme-example-ocean'

export const CustomThemePlugin: IAbstractPlugin = {
  name: 'CustomThemePlugin',

  onInit ({ container }) {
    container.bind('DynamicTypes/Theme/ExampleOcean').to(DynamicTypeThemeExampleOcean)
  },

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(CustomThemeExtension)
  }
}
