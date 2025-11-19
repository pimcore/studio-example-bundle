import { AbstractDecorator } from "@pimcore/studio-ui-bundle/modules/element";
import { withPqlFilterProvider } from "./with-pql-filter-provider";
import { withPqlFilterSidebar } from "./with-pql-filter-sidebar";
import { withPqlFilterQuery } from "./with-pql-filter-query";

export const PqlFilterDecorator: AbstractDecorator = (props) => {
  const { useSidebarOptions, ContextComponent, useDataQueryHelper } = props;

  return {
    ...props,
    ContextComponent: withPqlFilterProvider(ContextComponent),
    useSidebarOptions: withPqlFilterSidebar(useSidebarOptions),
    useDataQueryHelper: withPqlFilterQuery(useDataQueryHelper),
  }
}
