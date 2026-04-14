import { Outlet } from "react-router";

import { Box, Flex } from "@chakra-ui/react";

import { AppSidebar, useSidebarState } from "@/widgets/app-shell";

export const EditorLayout = () => {
  const {
    isExpanded,
    isLogoutMenuOpen,
    toggleExpanded,
    toggleLogoutMenu,
    closeLogoutMenu,
  } = useSidebarState();

  return (
    <Flex w="100vw" h="100dvh" overflow="hidden" bg="gray.50">
      <AppSidebar
        isExpanded={isExpanded}
        isLogoutMenuOpen={isLogoutMenuOpen}
        onToggleExpanded={toggleExpanded}
        onToggleLogoutMenu={toggleLogoutMenu}
        onCloseLogoutMenu={closeLogoutMenu}
      />
      <Box flex={1} minW={0} overflow="hidden" position="relative">
        <Outlet />
      </Box>
    </Flex>
  );
};
