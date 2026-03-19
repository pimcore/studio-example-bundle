import { injectable } from 'inversify'
import React from 'react'
import { DynamicTypeFieldDefinitionDataAbstract } from '@pimcore/studio-ui-bundle/modules/field-definitions'
import { type ElementIcon } from '@pimcore/studio-ui-bundle/modules/widget-manager'

@injectable()
export class DynamicTypeFieldDefinitionSimpleText extends DynamicTypeFieldDefinitionDataAbstract {
  id: string = 'simpleText'

  // Icon shown in the "Add Data Component" dropdown of the class editor.
  getIcon (): ElementIcon {
    return { type: 'name', value: 'text-input' }
  }

  // Places this type in the "Text" category of the dropdown.
  // The base class already returns ['data'].
  getGroup (): string[] {
    return [...super.getGroup(), 'text']
  }

  // Type-specific settings shown in the "Specific Settings" panel
  // of the class editor when this field is selected.
  // Return form fields here (e.g. column length, regex pattern).
  // Empty fragment means no type-specific settings.
  getSpecificFormFields (): React.JSX.Element {
    return <></>
  }
}
