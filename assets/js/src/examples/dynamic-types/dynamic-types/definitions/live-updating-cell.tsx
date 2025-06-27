import { type AbstractGridCellDefinition, DynamicTypeGridCellAbstract } from '@pimcore/studio-ui-bundle/modules/element'
import React, { type ReactElement } from 'react'
import { LiveUpdatingCellComponent } from '../components/live-updating-cell-component'
import { injectable } from '@pimcore/studio-ui-bundle/app'

@injectable()
export class LiveUpdatingCell extends DynamicTypeGridCellAbstract {
  id: string = 'live-updating'

  getGridCellComponent (props: AbstractGridCellDefinition): ReactElement<AbstractGridCellDefinition> {
    return <LiveUpdatingCellComponent { ...props } />
  }
}
