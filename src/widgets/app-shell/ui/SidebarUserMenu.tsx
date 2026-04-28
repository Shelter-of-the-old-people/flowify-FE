import { useState } from "react";
import { type IconType } from "react-icons";
import { useNavigate } from "react-router";

import { Box, Button, Icon, Menu, Portal, Text } from "@chakra-ui/react";

import { useLogout } from "@/features/auth/logout";
import { ROUTE_PATHS } from "@/shared";

type SidebarUserMenuProps = {
  icon: IconType;
  label: string;
  isExpanded: boolean;
};

export const SidebarUserMenu = ({
  icon,
  label,
  isExpanded,
}: SidebarUserMenuProps) => {
  const { isPending, logout } = useLogout();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Menu.Root
      lazyMount
      unmountOnExit
      open={isOpen}
      onOpenChange={(details) => setIsOpen(details.open)}
      positioning={{ placement: "right-end", gutter: 8 }}
    >
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          justifyContent={isExpanded ? "flex-start" : "center"}
          alignItems="center"
          gap={isExpanded ? 3 : 0}
          w={isExpanded ? "full" : 7}
          h={7}
          minW={7}
          minH={7}
          px={isExpanded ? 2 : 0}
          borderRadius="8px"
          color={isOpen ? "gray.900" : "gray.700"}
          bg={isOpen ? "gray.100" : "transparent"}
          _hover={{ bg: "gray.100" }}
          _expanded={{ bg: "gray.100", color: "gray.900" }}
          aria-label={isExpanded ? `${label} 메뉴` : `${label} 메뉴 열기`}
        >
          <Icon as={icon} boxSize="20px" flexShrink={0} />
          <Box
            maxW={isExpanded ? "120px" : "0px"}
            opacity={isExpanded ? 1 : 0}
            overflow="hidden"
            transition="max-width 220ms ease, opacity 180ms ease"
          >
            <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
              {label}
            </Text>
          </Box>
        </Button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner zIndex={20}>
          <Menu.Content
            minW="144px"
            p={1.5}
            borderRadius="12px"
            borderColor="gray.200"
            boxShadow="0 10px 30px rgba(15, 23, 42, 0.12)"
          >
            <Menu.Item
              value="account"
              onSelect={() => {
                navigate(ROUTE_PATHS.ACCOUNT);
              }}
            >
              계정 정보
            </Menu.Item>
            <Menu.Item
              value="logout"
              disabled={isPending}
              onSelect={() => {
                void logout();
              }}
            >
              {isPending ? "로그아웃 중..." : "로그아웃"}
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};
