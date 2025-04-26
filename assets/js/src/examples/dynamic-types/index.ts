import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DynamicTypeExtension } from './modules/dynamic-types-extension'
import { LiveUpdatingCell } from './dynamic-types/definitions/live-updating-cell'

export const DynamicTypePlugin: IAbstractPlugin = {
  name: 'DynamicTypePlugin',

  onInit ({ container }) {
    container.bind('DynamicTypes/GridCell/LiveUpdatingCell').to(LiveUpdatingCell)
  },

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(DynamicTypeExtension)
  }
}
