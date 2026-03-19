import React from 'react'
import { injectable } from '@pimcore/studio-ui-bundle/app'
import {
  DynamicTypeAbstractGDPRProvider,
  type GDPRProviderTabProps
} from '@pimcore/studio-ui-bundle/modules/gdpr-data-extractor'
import { MyProviderTab, type MyProviderTabProps } from '../components/my-provider-tab'

@injectable()
export class DynamicTypeMyProviderGDPR extends DynamicTypeAbstractGDPRProvider {
  // Must match getKey() from the PHP DataProviderInterface implementation
  readonly id: string = 'my_data_provider'

  getTabContent<T> (tabProps: GDPRProviderTabProps<T>): React.JSX.Element {
    return <MyProviderTab { ...(tabProps as unknown as MyProviderTabProps) } />
  }
}
