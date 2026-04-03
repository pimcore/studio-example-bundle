import { injectable } from 'inversify'
import React from 'react'
import {
  DynamicTypeObjectLayoutAbstract,
  type AbstractObjectLayoutDefinition
} from '@pimcore/studio-ui-bundle/modules/element'

interface SimpleTextLayoutProps extends AbstractObjectLayoutDefinition {
  html?: string
}

@injectable()
export class DynamicTypeObjectLayoutSimpleTextLayout extends DynamicTypeObjectLayoutAbstract {
  readonly id = 'simpleTextLayout'

  getObjectLayoutComponent (props: SimpleTextLayoutProps): React.ReactElement {
    return (
      <div dangerouslySetInnerHTML={ { __html: props.html ?? '' } } />
    )
  }
}
