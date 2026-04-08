import { Outlet } from "react-router";

import { Box, Flex } from "@chakra-ui/react";

import { useSidebarState } from "../model/useSidebarState";

import { AppSidebar } from "./AppSidebar";

export const AppShellLayout = () => {
  const {
    isExpanded,
    isLogoutMenuOpen,
    toggleExpanded,
    toggleLogoutMenu,
    closeLogoutMenu,
  } = useSidebarState();

  return (
    <Flex h="100dvh" minH="100dvh" bg="gray.50">
      <AppSidebar
        isExpanded={isExpanded}
        isLogoutMenuOpen={isLogoutMenuOpen}
        onToggleExpanded={toggleExpanded}
        onToggleLogoutMenu={toggleLogoutMenu}
        onCloseLogoutMenu={closeLogoutMenu}
      />
      <Box
        as="main"
        flex={1}
        minW={0}
        overflow="auto"
        px={{ base: 6, md: 10 }}
        py={{ base: 6, md: 8 }}
      >
        <Outlet />
      </Box>
    </Flex>
  );
};
