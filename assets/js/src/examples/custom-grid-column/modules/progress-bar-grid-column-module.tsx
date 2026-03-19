import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { type DynamicTypeGridCellRegistry } from '@pimcore/studio-ui-bundle/modules/element'

const GRID_CELL_SERVICE_ID = 'ExampleBundle/DynamicTypes/GridCell/ProgressBar'

export const ProgressBarGridColumnModule: AbstractModule = {
  onInit: (): void => {
    const gridCellRegistry = container.get<DynamicTypeGridCellRegistry>(
      serviceIds['DynamicTypes/GridCellRegistry']
    )

    gridCellRegistry.registerDynamicType(container.get(GRID_CELL_SERVICE_ID))
  }
}
