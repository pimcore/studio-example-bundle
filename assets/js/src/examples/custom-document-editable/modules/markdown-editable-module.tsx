import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type DynamicTypeDocumentEditableRegistry } from '@pimcore/studio-ui-bundle/modules/element'

const MARKDOWN_SERVICE_ID = 'ExampleBundle/DynamicTypes/DocumentEditable/Markdown'

export const MarkdownEditableModule: AbstractModule = {
  onInit: (): void => {
    const registry = container.get<DynamicTypeDocumentEditableRegistry>(
      serviceIds['DynamicTypes/DocumentEditableRegistry']
    )

    registry.registerDynamicType(container.get(MARKDOWN_SERVICE_ID))
  }
}
