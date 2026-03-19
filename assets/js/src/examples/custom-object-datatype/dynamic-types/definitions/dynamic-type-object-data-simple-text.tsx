import { injectable } from 'inversify'
import { container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { DynamicTypeObjectDataAbstractInput } from '@pimcore/studio-ui-bundle/modules/element'

@injectable()
export class DynamicTypeObjectDataSimpleText extends DynamicTypeObjectDataAbstractInput {
  id: string = 'simpleText'

  readonly dynamicTypeFieldFilterType: any = container.get(serviceIds['DynamicTypes/FieldFilter/String'])

  getDefaultGridColumnWidth (): number | undefined {
    return 350
  }
}
