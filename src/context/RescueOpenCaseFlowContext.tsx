import React, { createContext, useContext } from 'react';

type RescueOpenCaseFlowContextValue = {
  close: () => void;
};

const RescueOpenCaseFlowContext = createContext<RescueOpenCaseFlowContextValue | null>(null);

export function RescueOpenCaseFlowProvider({
  close,
  children,
}: {
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <RescueOpenCaseFlowContext.Provider value={{ close }}>
      {children}
    </RescueOpenCaseFlowContext.Provider>
  );
}

export function useRescueOpenCaseFlowOptional() {
  return useContext(RescueOpenCaseFlowContext);
}

export function useRescueOpenCaseBack(navigation: { canGoBack: () => boolean; goBack: () => void }) {
  const flow = useRescueOpenCaseFlowOptional();
  return () => {
    if (navigation.canGoBack()) navigation.goBack();
    else flow?.close();
  };
}
