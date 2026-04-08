import { useMemo } from "react";
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import { useLocation, useNavigate } from "react-router";

import { Flex } from "@chakra-ui/react";

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
  isLogoutMenuOpen: boolean;
  onToggleExpanded: () => void;
  onToggleLogoutMenu: () => void;
  onCloseLogoutMenu: () => void;
};

export const AppSidebar = ({
  isExpanded,
  isLogoutMenuOpen,
  onToggleExpanded,
  onToggleLogoutMenu,
  onCloseLogoutMenu,
}: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
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
    onCloseLogoutMenu();

    if (path) {
      navigate(path);
    }
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
      onMouseLeave={onCloseLogoutMenu}
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
              onClick={() => handleRouteClick(item.path)}
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
              onClick={() => handleRouteClick(item.path)}
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
              isOpen={isLogoutMenuOpen}
              onToggle={onToggleLogoutMenu}
              onClose={onCloseLogoutMenu}
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
