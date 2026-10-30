import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'

// Placeholder for the Change Control demo: it registers its modules in onStartup once it lands.
// Its types come from @pimcore/change-control-bundle (e.g. '@pimcore/change-control-bundle/sdk').
export const ChangeControlPlugin: IAbstractPlugin = {
  name: 'ChangeControlPlugin',

  onStartup () {}
}
