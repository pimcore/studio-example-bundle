import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DynamicTypeObjectLayoutSimpleTextLayout } from './dynamic-types/definitions/dynamic-type-object-layout-simple-text-layout'
import { DynamicTypeFieldDefinitionSimpleTextLayout } from './dynamic-types/definitions/dynamic-type-field-definition-simple-text-layout'
import { SimpleTextLayoutModule } from './modules/simple-text-layout-module'

const OBJECT_LAYOUT_SERVICE_ID = 'ExampleBundle/DynamicTypes/ObjectLayout/SimpleTextLayout'
const FIELD_DEFINITION_SERVICE_ID = 'ExampleBundle/DynamicTypes/FieldDefinition/SimpleTextLayout'

export const CustomObjectLayoutTypePlugin: IAbstractPlugin = {
  name: 'CustomObjectLayoutTypePlugin',

  onInit: ({ container }): void => {
    container.bind(OBJECT_LAYOUT_SERVICE_ID)
      .to(DynamicTypeObjectLayoutSimpleTextLayout)
      .inSingletonScope()

    container.bind(FIELD_DEFINITION_SERVICE_ID)
      .to(DynamicTypeFieldDefinitionSimpleTextLayout)
      .inSingletonScope()
  },

  onStartup: ({ moduleSystem }): void => {
    moduleSystem.registerModule(SimpleTextLayoutModule)
  }
}
