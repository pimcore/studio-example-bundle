import { componentRegistry, pluginSystem, previewStage, slots, type IAbstractPlugin } from '@pimcore/portal-plugin-sdk'
import { TalkNavEntry } from '../../talk/TalkNavEntry'
import { CoasterPreviewStage } from './coaster/preview-stage/CoasterPreviewStage'

// The enterprise examples' portal plugin. Each example registers its extension points (slots, action surfaces) in
// the module's onInit below.
export const studioExampleEnterprisePlugin: IAbstractPlugin = pluginSystem.definePlugin({
  name: 'studio-example-enterprise',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule({
      onInit () {
        // the portal page "Talk" (talk/README.md): its entry under the navigation rail's own items
        componentRegistry.registerToSlot(slots.navEntries, { name: 'studio-example-enterprise/talk', component: TalkNavEntry })
        // the asset detail's preview stage for .coaster files (coaster/preview-stage/README.md); every other asset
        // keeps the portal's own stage, because CoasterPreviewStage.accepts declines it
        componentRegistry.register({ name: previewStage, component: CoasterPreviewStage })
      }
    })
  }
})
