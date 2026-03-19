import { injectable } from 'inversify'
import React from 'react'
import {
  DynamicTypeFieldDefinitionLayoutAbstract,
  type FieldDefinitionLayout
} from '@pimcore/studio-ui-bundle/modules/field-definitions'
import { type ElementIcon } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { Form, TextArea } from '@pimcore/studio-ui-bundle/components'

interface SimpleTextLayoutDefinition extends FieldDefinitionLayout {
  html: string
}

@injectable()
export class DynamicTypeFieldDefinitionSimpleTextLayout extends DynamicTypeFieldDefinitionLayoutAbstract {
  id: string = 'simpleTextLayout'

  getIcon (): ElementIcon {
    return { type: 'name', value: 'text-field' }
  }

  getGroup (): string[] {
    return [...super.getGroup(), 'text']
  }

  getDefaultData (): SimpleTextLayoutDefinition {
    return {
      ...super.getDefaultData(),
      html: ''
    }
  }

  getSpecificFormFields (): React.JSX.Element {
    return (
      <Form.Item
        label="HTML Content"
        name="html"
      >
        <TextArea rows={ 6 } />
      </Form.Item>
    )
  }
}
