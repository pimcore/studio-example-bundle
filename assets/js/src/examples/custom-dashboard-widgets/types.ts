import { type ReactElement, type FC } from 'react'

/**
 * Local mirror of the studio-dashboards widget-definition contract
 * (`DynamicTypeWidgetTypeDefinitionAbstract` / `DynamicTypeWidgetTypeRegistry`).
 *
 * Declared locally on purpose - the dashboards bundle's runtime is loaded via
 * module federation and exposes only its root plugin entry, so the widget
 * registers itself into the dashboards widget-type registry resolved from the
 * shared DI container by the string id below (never a deep import from the
 * dashboards bundle).
 */

export interface IWidgetSelectOption {
  value: string
  label: string
}

export interface IWidgetConfig {
  config: any
  data: any
  layoutConfig: any
}

export interface IWidgetAllowedVisualizations {
  slotData: { row: number, column: number }
  visualizationData: IWidgetSelectOption[]
}

export interface IWidgetIsAllowedBySlot {
  slotData: { row: number, column: number }
}

export interface IWidgetAdditionalFormElements {
  slotData: { row: number, column: number }
  visualizationData: IWidgetSelectOption[]
}

export interface IWidgetEditModeViewItem {
  label: string
  value: any
}

export interface IDynamicTypeWidgetTypeDefinition {
  readonly id: string
  getWidgetComponent: (props: IWidgetConfig) => ReactElement
  getWidgetHeaderComponent: (props: IWidgetConfig) => ReactElement | null
  getWidgetEditModeView: (config: any) => IWidgetEditModeViewItem[]
  getWidgetAllowedVisualizations: (props: IWidgetAllowedVisualizations) => IWidgetSelectOption[]
  getWidgetIsAllowedBySlot: (props: IWidgetIsAllowedBySlot) => boolean
  getWidgetAdditionalFormElements: (props: IWidgetAdditionalFormElements) => FC<any> | null
}

/**
 * Minimal view of the dashboards widget-type registry, resolved from the shared
 * DI container by its string service id (below) - not imported from the SDK.
 */
export interface IWidgetTypeRegistry {
  registerDynamicType: (type: IDynamicTypeWidgetTypeDefinition) => void
}

/** Service id under which the dashboards plugin binds its widget-type registry. */
export const WIDGET_TYPE_REGISTRY_SERVICE_ID = 'StudioDashboards/DynamicTypes/WidgetType/Registry'

/** Service id under which this plugin binds the top-assets widget definition. */
export const TOP_ASSETS_WIDGET_SERVICE_ID = 'StudioExample/DynamicTypes/WidgetType/TopAssets'

/** Must match the backend `TopAssetsConfigRepository::getSupportedWidgetType()`. */
export const TOP_ASSETS_WIDGET_TYPE = 'top_assets'

export interface ITopAssetEntry {
  id: number
  filename: string
  fullPath: string
  /** Unix timestamp of the last modification. */
  modificationDate: number
}

export interface ITopAssetsData {
  items: ITopAssetEntry[]
}
