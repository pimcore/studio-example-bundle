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
      // TODO: remove these directives once studio-ui-bundle#3647 is released and the SDK pin here is bumped.
      // @ts-expect-error the workflow.modal slot config is added in studio-ui-bundle#3647, which is not yet in a published canary.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- slot name resolves to any until studio-ui-bundle#3647 is published.
      componentConfig.element.editor.workflow.modal.slots.center.name,
      {
        name: 'reviewers',
        priority: 100,
        component: ReviewersField
      }
    )
  }
}
