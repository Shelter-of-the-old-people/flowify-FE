import { useCallback, useState } from "react";

export const useSidebarState = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLogoutMenuOpen, setIsLogoutMenuOpen] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((current) => !current);
  }, []);

  const openLogoutMenu = useCallback(() => {
    setIsLogoutMenuOpen(true);
  }, []);

  const closeLogoutMenu = useCallback(() => {
    setIsLogoutMenuOpen(false);
  }, []);

  const toggleLogoutMenu = useCallback(() => {
    setIsLogoutMenuOpen((current) => !current);
  }, []);

  return {
    isExpanded,
    isLogoutMenuOpen,
    toggleExpanded,
    openLogoutMenu,
    closeLogoutMenu,
    toggleLogoutMenu,
  };
};
