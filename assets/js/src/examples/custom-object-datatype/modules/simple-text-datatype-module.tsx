import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type DynamicTypeObjectDataRegistry } from '@pimcore/studio-ui-bundle/modules/element'
import { type DynamicTypeFieldDefinitionRegistry } from '@pimcore/studio-ui-bundle/modules/field-definitions'

const OBJECT_DATA_SERVICE_ID = 'ExampleBundle/DynamicTypes/ObjectData/SimpleText'
const FIELD_DEFINITION_SERVICE_ID = 'ExampleBundle/DynamicTypes/FieldDefinition/SimpleText'

export const SimpleTextDatatypeModule: AbstractModule = {
  onInit: (): void => {
    const objectDataRegistry = container.get<DynamicTypeObjectDataRegistry>(
      serviceIds['DynamicTypes/ObjectDataRegistry']
    )
    objectDataRegistry.registerDynamicType(container.get(OBJECT_DATA_SERVICE_ID))

    const fieldDefinitionRegistry = container.get<DynamicTypeFieldDefinitionRegistry>(
      serviceIds['DynamicTypes/FieldDefinitionRegistry']
    )
    fieldDefinitionRegistry.registerDynamicType(container.get(FIELD_DEFINITION_SERVICE_ID))
  }
}
