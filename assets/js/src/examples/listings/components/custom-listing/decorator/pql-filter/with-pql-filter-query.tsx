import { type AbstractDecoratorProps } from '@pimcore/studio-ui-bundle/modules/element'
import { usePqlFilterContext } from './provider/pql-filter-provider'

export const withPqlFilterQuery = (useBaseHook: AbstractDecoratorProps['useDataQueryHelper']): AbstractDecoratorProps['useDataQueryHelper'] => {
  const usePqlDataQueryHelper: AbstractDecoratorProps['useDataQueryHelper'] = () => {
    const { getArgs: baseGetArgs, ...baseProps } = useBaseHook()
    const { pqlFilter } = usePqlFilterContext()

    const getArgs: typeof baseGetArgs = () => {
      const baseArgs = baseGetArgs()

      return {
        ...baseArgs,
        body: {
          ...baseArgs.body,
          filters: {
            ...baseArgs.body?.filters,
            columnFilters: [
              ...(baseArgs.body?.filters?.columnFilters ?? []),
              ...pqlFilter !== null
                ? [{
                    type: 'system.pql',
                    locale: null,
                    filterValue: pqlFilter
                  }]
                : []
            ]
          }
        }
      }
    }

    return {
      ...baseProps,
      getArgs
    }
  }

  return usePqlDataQueryHelper
}
