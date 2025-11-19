import React from "react";
import { AbstractDecoratorProps } from "@pimcore/studio-ui-bundle/modules/element";
import { PqlFilterProvider } from "./provider/pql-filter-provider";

export const withPqlFilterProvider = (ContextComponent: AbstractDecoratorProps['ContextComponent']): AbstractDecoratorProps['ContextComponent'] => {
  const PqlContextComponent = (): React.JSX.Element => {
    return (
      <PqlFilterProvider>
        <ContextComponent />
      </PqlFilterProvider>
    );
  }
  
  return PqlContextComponent
}
