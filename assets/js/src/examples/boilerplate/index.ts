import { IAbstractPlugin } from "@pimcore/studio-ui-bundle";

export const BoilerplatePlugin: IAbstractPlugin = {
  name: 'BoilerplatePlugin',

  onInit({ container }) {
    // This is where you would initialize your plugin
    // Most common use case would be to register new services here
    // container.bind('some-service', SomeService);
  },

  onStartup ({ moduleSystem }) {
    // This is where you would register your modules
    // moduleSystem.registerModule(YourModule)
  }
}
