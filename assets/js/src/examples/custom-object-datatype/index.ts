import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DynamicTypeObjectDataSimpleText } from './dynamic-types/definitions/dynamic-type-object-data-simple-text'
import { DynamicTypeFieldDefinitionSimpleText } from './dynamic-types/definitions/dynamic-type-field-definition-simple-text'
import { SimpleTextDatatypeModule } from './modules/simple-text-datatype-module'

const OBJECT_DATA_SERVICE_ID = 'ExampleBundle/DynamicTypes/ObjectData/SimpleText'
const FIELD_DEFINITION_SERVICE_ID = 'ExampleBundle/DynamicTypes/FieldDefinition/SimpleText'

export const CustomObjectDatatypePlugin: IAbstractPlugin = {
  name: 'CustomObjectDatatypePlugin',

  onInit: ({ container }): void => {
    container.bind(OBJECT_DATA_SERVICE_ID)
      .to(DynamicTypeObjectDataSimpleText)
      .inSingletonScope()

    container.bind(FIELD_DEFINITION_SERVICE_ID)
      .to(DynamicTypeFieldDefinitionSimpleText)
      .inSingletonScope()
  },

  onStartup: ({ moduleSystem }): void => {
    moduleSystem.registerModule(SimpleTextDatatypeModule)
  }
}
