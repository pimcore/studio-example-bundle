import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DynamicTypeMyProviderGDPR } from './dynamic-types/dynamic-type-my-provider'
import { MyProviderModule } from './modules/my-provider-module'

export const GdprDataExtractorPlugin: IAbstractPlugin = {
  name: 'GdprDataExtractorPlugin',

  onInit: ({ container }): void => {
    container.bind('ExampleBundle/DynamicTypes/GDPRProvider/MyProvider')
      .to(DynamicTypeMyProviderGDPR)
      .inSingletonScope()
  },

  onStartup: ({ moduleSystem }): void => {
    moduleSystem.registerModule(MyProviderModule)
  }
}
