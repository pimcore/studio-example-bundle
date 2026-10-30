import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { CoasterReviewTabExtension } from './modules/coaster-review-tab-extension'

export const CoasterReviewPlugin: IAbstractPlugin = {
  name: 'CoasterReviewPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(CoasterReviewTabExtension)
  }
}
