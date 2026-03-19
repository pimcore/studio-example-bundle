import { injectable } from '@pimcore/studio-ui-bundle/app'
import { TabManager } from '@pimcore/studio-ui-bundle/modules/element'

@injectable()
export class BookTabManager extends TabManager {
  constructor () {
    super()
    this.type = 'book'
  }
}
