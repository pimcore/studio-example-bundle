import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { componentConfig, type ComponentRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { ReviewersField } from '../components/reviewers-field'

export const WorkflowModalExtension: AbstractModule = {
  onInit (): void {
    const componentRegistry = container.get<ComponentRegistry>(
      serviceIds['App/ComponentRegistry/ComponentRegistry']
    )

    componentRegistry.registerToSlot(
      componentConfig.element.editor.workflow.modal.slots.center.name,
      {
        name: 'reviewers',
        priority: 100,
        component: ReviewersField
      }
    )
  }
}
