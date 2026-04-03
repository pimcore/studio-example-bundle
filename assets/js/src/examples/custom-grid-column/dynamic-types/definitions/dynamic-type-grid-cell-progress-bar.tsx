import React, { type ReactElement } from 'react'
import { type AbstractGridCellDefinition, DynamicTypeGridCellAbstract } from '@pimcore/studio-ui-bundle/modules/element'
import { injectable } from 'inversify'
import { ProgressBarCell } from '../../components/progress-bar-cell'

@injectable()
export class DynamicTypeGridCellProgressBar extends DynamicTypeGridCellAbstract {
  readonly id = 'progressBar'

  getGridCellComponent (props: AbstractGridCellDefinition): ReactElement<AbstractGridCellDefinition> {
    return <ProgressBarCell { ...props } />
  }

  getDefaultGridColumnWidth (): number | undefined {
    return 180
  }
}
