import { container } from "@pimcore/studio-ui-bundle";
import { BaseListing, DataObjectProvider, listingDefaultProps, ObjectListingBuilder } from "@pimcore/studio-ui-bundle/modules/data-object";
import React from "react";

export const CustomListing = (): React.JSX.Element => {
  const listingBuilder = container.get<ObjectListingBuilder>("Cars/Listing/Builder");

  return (
    <DataObjectProvider id={ 1 }>
      <BaseListing {
        ...listingBuilder.build({ 
          props: {
            ...listingDefaultProps,
            toolbarSlotName: 'carsListing.toolbar',
          },
          // optional config to control behavior of the different decorators
          config: {
            'tagFilter': {
              enabled: false
            }
          }
        })
      } />
    </DataObjectProvider>
  )
}
