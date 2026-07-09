import React, { type ReactElement } from 'react'
import { injectable } from '@pimcore/studio-ui-bundle/app'
import { Form, Select } from '@pimcore/studio-ui-bundle/components'
import { TopAssetsWidget } from '../../components/top-assets-widget'
import {
  TOP_ASSETS_WIDGET_TYPE,
  type IDynamicTypeWidgetTypeDefinition,
  type IWidgetAllowedVisualizations,
  type IWidgetConfig,
  type IWidgetEditModeViewItem,
  type IWidgetIsAllowedBySlot,
  type IWidgetSelectOption
} from '../../types'

/**
 * Studio-dashboards widget definition for the `top_assets` example widget.
 *
 * The `id` ties everything together: it must match the type string returned by
 * the backend `TopAssetsConfigRepository::getSupportedWidgetType()` and the
 * `pimcore_studio_dashboards.widget_types` entry. The `limit` form field is
 * rendered via `getWidgetAdditionalFormElements`; its field `name` matches the
 * backend `SaveTopAssetsWidgetConfig` property so the generic save flow
 * persists it.
 */
@injectable()
export class DynamicTypeWidgetTypeTopAssets implements IDynamicTypeWidgetTypeDefinition {
  readonly id = TOP_ASSETS_WIDGET_TYPE

  getWidgetComponent ({ data }: IWidgetConfig): ReactElement {
    return (
      <TopAssetsWidget
        content={ data ?? {} }
      />
    )
  }

  getWidgetHeaderComponent (): React.JSX.Element | null {
    return null
  }

  getWidgetEditModeView (config: any): IWidgetEditModeViewItem[] {
    return [
      {
        label: 'Limit',
        value: config.limit ?? 10
      }
    ]
  }

  getWidgetAllowedVisualizations ({ visualizationData }: IWidgetAllowedVisualizations): IWidgetSelectOption[] {
    return visualizationData
  }

  getWidgetIsAllowedBySlot ({ slotData }: IWidgetIsAllowedBySlot): boolean {
    return true
  }

  getWidgetAdditionalFormElements (): React.FC<any> | null {
    const AdditionalFormElements: React.FC<any> = () => (
      <Form.Item
        initialValue={ 10 }
        label='Limit'
        name='limit'
      >
        <Select
          options={ [
            { value: 5, label: '5' },
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: 50, label: '50' }
          ] }
        />
      </Form.Item>
    )

    return AdditionalFormElements
  }
}
