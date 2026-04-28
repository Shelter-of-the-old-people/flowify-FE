import { useCallback, useState } from "react";

export const useSidebarState = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((current) => !current);
  }, []);

  return {
    isExpanded,
    toggleExpanded,
  };
};
