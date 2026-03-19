import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type DynamicTypeObjectLayoutRegistry } from '@pimcore/studio-ui-bundle/modules/element'
import { type DynamicTypeFieldDefinitionRegistry } from '@pimcore/studio-ui-bundle/modules/field-definitions'

const OBJECT_LAYOUT_SERVICE_ID = 'ExampleBundle/DynamicTypes/ObjectLayout/SimpleTextLayout'
const FIELD_DEFINITION_SERVICE_ID = 'ExampleBundle/DynamicTypes/FieldDefinition/SimpleTextLayout'

export const SimpleTextLayoutModule: AbstractModule = {
  onInit: (): void => {
    const objectLayoutRegistry = container.get<DynamicTypeObjectLayoutRegistry>(
      serviceIds['DynamicTypes/ObjectLayoutRegistry']
    )
    objectLayoutRegistry.registerDynamicType(container.get(OBJECT_LAYOUT_SERVICE_ID))

    const fieldDefinitionRegistry = container.get<DynamicTypeFieldDefinitionRegistry>(
      serviceIds['DynamicTypes/FieldDefinitionRegistry']
    )
    fieldDefinitionRegistry.registerDynamicType(container.get(FIELD_DEFINITION_SERVICE_ID))
  }
}
