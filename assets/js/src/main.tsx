import { Pimcore } from '@pimcore/studio-ui-bundle'
import { MainNavEntryExtension } from './examples/main-nav-entry'

if (module.hot !== undefined) {
  module.hot.accept()
}

Pimcore.pluginSystem.registerPlugin({
  name: 'pimcore-plugin',

  // Register and overwrite services here
  onInit: ({ container }): void => {

  },

  // register modules here
  onStartup: ({ moduleSystem }): void => {
    console.log('Hello from the demo plugin!')

    moduleSystem.registerModule(MainNavEntryExtension)
  }
})
