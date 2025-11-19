import React, { createContext, useContext, useState } from "react";

export interface IPqlFilterContext {
  pqlFilter: string | null;
  setPqlFilter: (filter: string | null) => void;
}

export const PqlFilterContext = createContext<IPqlFilterContext | undefined>(undefined);

export interface IPqlFilterProviderProps {
  children: React.ReactNode;
}

export const PqlFilterProvider = ({ children }: IPqlFilterProviderProps): React.JSX.Element => {
  const [pqlFilter, setPqlFilter] = useState<string | null>(null);

  return (
    <PqlFilterContext.Provider value={{ pqlFilter, setPqlFilter }}>
      {children}
    </PqlFilterContext.Provider>
  );
}

export const usePqlFilterContext = (): IPqlFilterContext => {
  const context = useContext(PqlFilterContext);

  if (!context) {
    throw new Error("usePqlFilterContext must be used within a PqlFilterProvider");
  }

  return context;
}
