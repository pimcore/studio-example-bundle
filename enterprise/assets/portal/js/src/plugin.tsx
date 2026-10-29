import { pluginSystem, type IAbstractPlugin } from '@pimcore/portal-plugin-sdk'

// The enterprise examples' portal plugin. It contributes nothing yet: the portal demo registers its
// extension points (slots, action surfaces) in the module's onInit below.
export const studioExampleEnterprisePlugin: IAbstractPlugin = pluginSystem.definePlugin({
  name: 'studio-example-enterprise',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule({
      onInit () {}
    })
  }
})
