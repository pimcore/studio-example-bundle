import { type AbstractModule, container } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import {
  type DynamicTypeGDPRProviderRegistry
} from '@pimcore/studio-ui-bundle/modules/gdpr-data-extractor'

export const MyProviderModule: AbstractModule = {
  onInit: (): void => {
    const gdprProviderRegistry = container.get<DynamicTypeGDPRProviderRegistry>(
      serviceIds['DynamicTypes/GDPRProviderRegistry']
    )

    gdprProviderRegistry.registerDynamicType(
      container.get('ExampleBundle/DynamicTypes/GDPRProvider/MyProvider')
    )
  }
}
