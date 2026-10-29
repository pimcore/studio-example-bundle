import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { TalkSlidesExtension } from './modules/talk-slides-extension'

export const TalkSlidesPlugin: IAbstractPlugin = {
  name: 'TalkSlidesPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(TalkSlidesExtension)
  }
}
