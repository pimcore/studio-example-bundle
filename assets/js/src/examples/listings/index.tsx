import { type IAbstractPlugin } from '@pimcore/studio-ui-bundle'
import { CustomDataObjectListingModule } from './modules/custom-data-object-listing'

export const ListingPlugin: IAbstractPlugin = {
  name: 'ListingPlugin',

  onStartup ({ moduleSystem }) {
    moduleSystem.registerModule(CustomDataObjectListingModule)
  }
}
