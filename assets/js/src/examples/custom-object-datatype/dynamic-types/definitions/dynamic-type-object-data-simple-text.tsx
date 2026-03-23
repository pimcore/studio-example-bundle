import { injectable } from 'inversify'
import type React from 'react'
import { container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { DynamicTypeObjectDataAbstractInput } from '@pimcore/studio-ui-bundle/modules/element'

@injectable()
export class DynamicTypeObjectDataSimpleText extends DynamicTypeObjectDataAbstractInput {
  id: string = 'simpleText'

  // Enables the string filter in the grid sidebar.
  // Default is 'DynamicTypes/FieldFilter/None' (filtering disabled).
  // The filter type determines both the filter UI component and the
  // backend filter used (here: system.string -> wildcard search).
  readonly dynamicTypeFieldFilterType: any = container.get(serviceIds['DynamicTypes/FieldFilter/String'])

  // Renders the field in the data object editor.
  // The abstract input class provides a default <Input> component.
  // Override this to render a custom component instead.
  getObjectDataComponent (props: any): React.ReactElement {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return super.getObjectDataComponent(props)
  }

  getDefaultGridColumnWidth (): number | undefined {
    return 350
  }
}
