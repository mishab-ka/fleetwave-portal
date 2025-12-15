import { useState, useCallback } from "react";

// Custom hook to manage refresh state across finance components
export const useFinanceRefresh = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return {
    refreshTrigger,
    triggerRefresh,
  };
};
