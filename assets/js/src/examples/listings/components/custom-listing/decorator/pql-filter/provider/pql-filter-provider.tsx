import React, { createContext, useContext, useMemo, useState } from 'react'

export interface IPqlFilterContext {
  pqlFilter: string | null
  setPqlFilter: (filter: string | null) => void
}

export const PqlFilterContext = createContext<IPqlFilterContext | undefined>(undefined)

export interface IPqlFilterProviderProps {
  children: React.ReactNode
}

export const PqlFilterProvider = ({ children }: IPqlFilterProviderProps): React.JSX.Element => {
  const [pqlFilter, setPqlFilter] = useState<string | null>(null)

  return useMemo(() => (
    <PqlFilterContext.Provider value={ { pqlFilter, setPqlFilter } }>
      {children}
    </PqlFilterContext.Provider>
  ), [pqlFilter, children])
}

export const usePqlFilterContext = (): IPqlFilterContext => {
  const context = useContext(PqlFilterContext)

  if (context === undefined) {
    throw new Error('usePqlFilterContext must be used within a PqlFilterProvider')
  }

  return context
}
