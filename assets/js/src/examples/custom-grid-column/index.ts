import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { DynamicTypeGridCellProgressBar } from './dynamic-types/definitions/dynamic-type-grid-cell-progress-bar'
import { ProgressBarGridColumnModule } from './modules/progress-bar-grid-column-module'

const GRID_CELL_SERVICE_ID = 'ExampleBundle/DynamicTypes/GridCell/ProgressBar'

export const CustomGridColumnPlugin: IAbstractPlugin = {
  name: 'CustomGridColumnPlugin',

  onInit: ({ container }): void => {
    container.bind(GRID_CELL_SERVICE_ID)
      .to(DynamicTypeGridCellProgressBar)
      .inSingletonScope()
  },

  onStartup: ({ moduleSystem }): void => {
    moduleSystem.registerModule(ProgressBarGridColumnModule)
  }
}
