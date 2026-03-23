import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { InDesignTabManager } from './asset/editor/types/indesign/tab-manager/indesign-tab-manager'
import { InDesignAssetModule } from './modules/indesign-asset-module'

export const CustomAssetTypePlugin: IAbstractPlugin = {
  name: 'CustomAssetTypePlugin',

  onInit: ({ container }): void => {
    container.bind('ExampleBundle/Asset/Editor/InDesignTabManager')
      .to(InDesignTabManager)
      .inSingletonScope()
  },

  onStartup: ({ moduleSystem }): void => {
    moduleSystem.registerModule(InDesignAssetModule)
  }
}
