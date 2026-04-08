import { Outlet } from "react-router";

import { Box, Flex } from "@chakra-ui/react";

import { useSidebarState } from "../model/useSidebarState";

import { AppSidebar } from "./AppSidebar";

export const AppShellLayout = () => {
  const { isExpanded, toggleExpanded } = useSidebarState();

  return (
    <Flex minH="100dvh" bg="gray.50">
      <AppSidebar isExpanded={isExpanded} onToggleExpanded={toggleExpanded} />
      <Box as="main" flex={1} minW={0} overflow="auto">
        <Outlet />
      </Box>
    </Flex>
  );
};
