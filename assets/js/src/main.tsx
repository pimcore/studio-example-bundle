import { Pimcore } from '@pimcore/studio-ui-bundle'
import { MainNavEntryPlugin } from './examples/main-nav-entry'
import { LeftSidebarPlugin } from './examples/left-sidebar'
import { AssetEditorToolbarButtonPlugin } from './examples/asset-editor-toolbar-button'
import { TabManagerPlugin } from './examples/tab-manager'
import { CustomIconPlugin } from './examples/custom-icons'
import { CustomWidgetsPlugin } from './examples/custom-widgets'
import { DynamicTypePlugin } from './examples/dynamic-types'
import { ApiDataPlugin } from './examples/api-data'

if (module.hot !== undefined) {
  module.hot.accept()
}

const pluginSystem = Pimcore.pluginSystem

// Examples are splitted into separate plugins to create a clear separation for better understanding.
// You can also combine them into one plugin if you want to.
pluginSystem.registerPlugin(MainNavEntryPlugin)
pluginSystem.registerPlugin(LeftSidebarPlugin)
pluginSystem.registerPlugin(AssetEditorToolbarButtonPlugin)
pluginSystem.registerPlugin(TabManagerPlugin)
pluginSystem.registerPlugin(CustomIconPlugin)
pluginSystem.registerPlugin(CustomWidgetsPlugin)
pluginSystem.registerPlugin(DynamicTypePlugin)
pluginSystem.registerPlugin(ApiDataPlugin)
