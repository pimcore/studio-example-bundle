import { componentRegistry, pluginSystem, slots, type IAbstractPlugin } from '@pimcore/portal-plugin-sdk'
import { TalkNavEntry } from '../../talk/TalkNavEntry'

// The enterprise examples' portal plugin. Each example registers its extension points (slots, action surfaces) in
// the module's onInit below.
export const studioExampleEnterprisePlugin: IAbstractPlugin = pluginSystem.definePlugin({
  name: 'studio-example-enterprise',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule({
      onInit () {
        // the portal page "Talk" (talk/README.md): its entry under the navigation rail's own items
        componentRegistry.registerToSlot(slots.navEntries, { name: 'studio-example-enterprise/talk', component: TalkNavEntry })
      }
    })
  }
})
