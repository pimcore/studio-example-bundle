import { DynamicTypeWidgetTypeAbstract } from '@pimcore/studio-ui-bundle/modules/widget-editor'
import { injectable } from '@pimcore/studio-ui-bundle/app'
import React from 'react'
import { IframeWidgetForm } from '../../components/iframe-widget-form'

@injectable()
export class DynamicTypeWidgetTypeIframe extends DynamicTypeWidgetTypeAbstract {
  readonly id = 'example_iframe'
  name = 'Iframe Widget'
  group = 'example-widgets'
  icon = 'mainDocument'

  form (): React.JSX.Element {
    return <IframeWidgetForm />
  }
}
