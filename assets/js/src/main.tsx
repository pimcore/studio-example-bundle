import { Pimcore } from '@pimcore/studio-ui-bundle'
import { ExampleModule } from './modules/example-module'

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
    moduleSystem.registerModule(ExampleModule)
    console.log('Hello from the demo plugin!')
  }
})
