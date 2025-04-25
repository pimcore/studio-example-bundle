import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { componentConfig, type ComponentRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import CustomToolbarButton from '../components/custom-toolbar-button'

export const AssetEditorToolbarButtonExtension: AbstractModule = {
  onInit: (): void => {
    const componentRegistry = container.get<ComponentRegistry>(serviceIds['App/ComponentRegistry/ComponentRegistry'])

    componentRegistry.registerToSlot(
      componentConfig.asset.editor.toolbar.slots.left.name,
      {
        name: 'customToolbarButton',
        component: CustomToolbarButton,
        priority: 500
      }
    )
  }
}
