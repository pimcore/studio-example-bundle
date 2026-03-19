import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import {
  TAB_DEPENDENCIES,
  TAB_NOTES_AND_EVENTS,
  TAB_PROPERTIES,
  TAB_TAGS,
  TAB_WORKFLOW,
  type TypeRegistryInterface
} from '@pimcore/studio-ui-bundle/modules/element'
import {
  TAB_CUSTOM_METADATA,
  TAB_VERSIONS
} from '@pimcore/studio-ui-bundle/modules/asset'
import { type InDesignTabManager } from '../asset/editor/types/indesign/tab-manager/indesign-tab-manager'

const INDESIGN_TAB_MANAGER_SERVICE_ID = 'ExampleBundle/Asset/Editor/InDesignTabManager'

const registerAssetType = (): void => {
  const typeRegistry = container.get<TypeRegistryInterface>(
    serviceIds['Asset/Editor/TypeRegistry']
  )

  typeRegistry.register({
    name: 'indesign',
    tabManagerServiceId: INDESIGN_TAB_MANAGER_SERVICE_ID
  })
}

const registerTabs = (): void => {
  const indesignTabManager = container.get<InDesignTabManager>(INDESIGN_TAB_MANAGER_SERVICE_ID)
  indesignTabManager.register(TAB_CUSTOM_METADATA)
  indesignTabManager.register(TAB_PROPERTIES)
  indesignTabManager.register(TAB_VERSIONS)
  indesignTabManager.register(TAB_DEPENDENCIES)
  indesignTabManager.register(TAB_NOTES_AND_EVENTS)
  indesignTabManager.register(TAB_TAGS)
  indesignTabManager.register(TAB_WORKFLOW)
}

export const InDesignAssetModule: AbstractModule = {
  onInit: (): void => {
    registerAssetType()
    registerTabs()
  }
}
