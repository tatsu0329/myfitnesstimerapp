"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface LayoutContextProps {
  showFooter: boolean;
  setShowFooter: (show: boolean) => void;
}

const LayoutContext = createContext<LayoutContextProps | undefined>(undefined);

export const LayoutProvider = ({ children }: { children: ReactNode }) => {
  const [showFooter, setShowFooter] = useState(true);

  return (
    <LayoutContext.Provider value={{ showFooter, setShowFooter }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
};
