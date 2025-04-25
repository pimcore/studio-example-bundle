import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { componentConfig, type ComponentRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { ExampleButton } from '../components/example-button'

export const LeftSidebarExtension: AbstractModule = {
  onInit: (): void => {
    const componentRegistry = container.get<ComponentRegistry>(serviceIds['App/ComponentRegistry/ComponentRegistry'])

    componentRegistry.registerToSlot(
      componentConfig.leftSidebar.slot.name,
      {
        name: 'exampleButton',
        component: ExampleButton,
        priority: 101
      }
    )
  }
}
