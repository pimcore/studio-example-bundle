import { container, type AbstractModule } from '@pimcore/studio-ui-bundle'
import { serviceIds } from '@pimcore/studio-ui-bundle/app'
import { componentConfig, ComponentRegistry, ComponentType, type MainNavRegistry } from '@pimcore/studio-ui-bundle/modules/app'
import { type WidgetRegistry } from '@pimcore/studio-ui-bundle/modules/widget-manager'
import { CustomListing } from '../widgets/custom-listing'
import { ListingBuilder } from '@pimcore/studio-ui-bundle/modules/element'
import { ClassDefinitionSelectionDecoratorConfig } from '@pimcore/studio-ui-bundle/modules/data-object'
import { PqlFilterDecorator } from '../components/custom-listing/decorator/pql-filter/pql-filter-decorator'
import { HeaderDecorator } from '../components/custom-listing/decorator/header/header-decorator'
import { Toolbar } from '../components/custom-listing/toolbar/toolbar'
import { ExtraButton } from '../components/custom-listing/toolbar/extra-button/extra-button'

export const CustomDataObjectListingModule: AbstractModule = {
  onInit: (): void => {
    const mainNavRegistryService = container.get<MainNavRegistry>(serviceIds.mainNavRegistry)

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin',
      icon: 'pimcore'
    })

    mainNavRegistryService.registerMainNavItem({
      path: 'Example Plugin/Listing Examples/Cars Listing',
      widgetConfig: {
        name: 'Cars',
        id: 'cars-listing',
        component: 'cars-listing',
        config: {
          icon: {
            type: 'name',
            value: 'car'
          }
        }
      }
    })

    const widgetRegistryService = container.get<WidgetRegistry>(serviceIds.widgetManager)
    widgetRegistryService.registerWidget({
      name: 'cars-listing',
      component: CustomListing
    })

    container.bind('Cars/Listing/Builder').toConstantValue(container.get<ListingBuilder>('DataObject/Listing/Builder').copy());
    const newListingBuilder = container.get<ListingBuilder>('Cars/Listing/Builder');
    
    newListingBuilder.addDecorator({
      name: 'pql-filter',
      decorator: PqlFilterDecorator
    })

    newListingBuilder.addDecorator({
      name: 'header',
      decorator: HeaderDecorator
    })

    // example usage of removing a decorator
    newListingBuilder.removeDecorator('generalFilters');

    // example usage of overriding a decorator
    const classDefinitionSelectionDecorator = newListingBuilder.getDecorator('classDefinitionSelection');

    if (classDefinitionSelectionDecorator !== undefined) {
      newListingBuilder.overrideDecorator({
        'name': 'classDefinitionSelection',
        config: {
          ...classDefinitionSelectionDecorator.config,
          ...{
            classRestriction: [{ classes: 'Car' }]
          } as ClassDefinitionSelectionDecoratorConfig
        }
      })  
    }

    const componentRegistry = container.get<ComponentRegistry>(serviceIds['App/ComponentRegistry/ComponentRegistry']);

    componentRegistry.registerConfig({
      carsListing: {
        toolbar: {
          component: {
            name: 'carsListing.toolbar',
            type: ComponentType.SINGLE
          },
          left: {
            type: ComponentType.SLOT,
            name: 'carsListing.toolbar.left',
          },
          right: {
            type: ComponentType.SLOT,
            name: 'carsListing.toolbar.right',
          }
        }
      }
    });

    componentRegistry.register({
      name: 'carsListing.toolbar',
      component: Toolbar
    })

    const leftSlots = componentRegistry.getSlotComponents(componentConfig.dataObject.listing.toolbar.left.name);
    const rightSlots = componentRegistry.getSlotComponents(componentConfig.dataObject.listing.toolbar.right.name);

    for (const leftSlot of leftSlots) {
      componentRegistry.registerToSlot('carsListing.toolbar.left', leftSlot);
    }

    componentRegistry.registerToSlot('carsListing.toolbar.right', {
      name: 'extraButton',
      component: ExtraButton
    });

    for (const rightSlot of rightSlots) {
      componentRegistry.registerToSlot('carsListing.toolbar.right', rightSlot);
    }

    componentRegistry.getSlotComponents('carsListing.toolbar.left');
  }
}
