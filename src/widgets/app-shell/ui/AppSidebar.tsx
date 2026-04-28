import { useMemo } from "react";
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import { useLocation, useNavigate } from "react-router";

import { Flex } from "@chakra-ui/react";

import { useCreateWorkflowShortcut } from "@/features/create-workflow";
import { sidebarLayoutSpec } from "@/shared/styles";

import {
  sidebarControlItem,
  sidebarPrimaryItems,
  sidebarSecondaryItems,
} from "../model/sidebarItems";

import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarUserMenu } from "./SidebarUserMenu";

type AppSidebarProps = {
  isExpanded: boolean;
  onToggleExpanded: () => void;
};

export const AppSidebar = ({
  isExpanded,
  onToggleExpanded,
}: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createWorkflow, isPending } = useCreateWorkflowShortcut();
  const toggleIcon = isExpanded
    ? MdKeyboardDoubleArrowLeft
    : MdKeyboardDoubleArrowRight;

  const activeRouteIds = useMemo(() => {
    return new Set(
      [...sidebarPrimaryItems, ...sidebarSecondaryItems]
        .filter((item) => {
          if (!item.path) return false;
          if (item.path === "/") return location.pathname === item.path;
          return location.pathname.startsWith(item.path);
        })
        .map((item) => item.id),
    );
  }, [location.pathname]);

  const handleRouteClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  const handlePrimaryItemClick = (
    item: (typeof sidebarPrimaryItems)[number],
  ) => {
    if (item.id === "create-workflow") {
      void createWorkflow();
      return;
    }

    handleRouteClick(item.path);
  };

  return (
    <Flex
      as="aside"
      direction="column"
      justify="space-between"
      w={`${isExpanded ? sidebarLayoutSpec.expandedWidth : sidebarLayoutSpec.collapsedWidth}px`}
      px={1.5}
      py={6}
      borderRight="1px solid"
      borderColor={sidebarLayoutSpec.borderColor}
      bg="white"
      transition="width 220ms ease"
      overflow="visible"
      flexShrink={0}
      alignSelf="stretch"
    >
      <Flex direction="column" gap={3}>
        <Flex direction="column" gap={1}>
          <SidebarNavItem
            icon={toggleIcon}
            label={isExpanded ? "접기" : sidebarControlItem.label}
            isExpanded={isExpanded}
            onClick={onToggleExpanded}
          />
          {sidebarPrimaryItems.slice(0, 1).map((item) => (
            <SidebarNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isExpanded={isExpanded}
              isActive={activeRouteIds.has(item.id)}
              isDisabled={isPending}
              onClick={() => handlePrimaryItemClick(item)}
            />
          ))}
        </Flex>

        <Flex direction="column" gap={1}>
          {sidebarPrimaryItems.slice(1).map((item) => (
            <SidebarNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isExpanded={isExpanded}
              isActive={activeRouteIds.has(item.id)}
              onClick={() => handlePrimaryItemClick(item)}
            />
          ))}
        </Flex>
      </Flex>

      <Flex direction="column" gap={1}>
        {sidebarSecondaryItems.map((item) =>
          item.kind === "user" ? (
            <SidebarUserMenu
              key={item.id}
              icon={item.icon}
              label={item.label}
              isExpanded={isExpanded}
            />
          ) : (
            <SidebarNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isExpanded={isExpanded}
              isActive={activeRouteIds.has(item.id)}
              isDisabled={item.kind === "placeholder"}
            />
          ),
        )}
      </Flex>
    </Flex>
  );
};
