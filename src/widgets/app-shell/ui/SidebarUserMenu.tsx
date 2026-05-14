import { useState } from "react";

import {
  Avatar,
  Box,
  Button,
  HStack,
  Menu,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useLogout } from "@/features/auth/logout";
import { getAuthUser } from "@/shared";

type SidebarUserMenuProps = {
  label: string;
  isExpanded: boolean;
};

export const SidebarUserMenu = ({
  label,
  isExpanded,
}: SidebarUserMenuProps) => {
  const { isPending, logout } = useLogout();
  const [isOpen, setIsOpen] = useState(false);
  const authUser = getAuthUser();
  const displayName = authUser?.name || label;
  const displayEmail = authUser?.email ?? "저장된 사용자 정보가 없습니다.";

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
          aria-label={
            isExpanded
              ? `${displayName} 계정 메뉴`
              : `${displayName} 계정 메뉴 열기`
          }
        >
          <Avatar.Root size="xs" flexShrink={0}>
            <Avatar.Fallback name={displayName} />
            <Avatar.Image src={authUser?.picture ?? undefined} />
          </Avatar.Root>
          <Box
            maxW={isExpanded ? "120px" : "0px"}
            opacity={isExpanded ? 1 : 0}
            overflow="hidden"
            transition="max-width 220ms ease, opacity 180ms ease"
          >
            <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
              {displayName}
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
            <HStack px={2.5} py={2} gap={3} align="center">
              <Avatar.Root size="sm" flexShrink={0}>
                <Avatar.Fallback name={displayName} />
                <Avatar.Image src={authUser?.picture ?? undefined} />
              </Avatar.Root>
              <VStack align="flex-start" gap={0} minW={0}>
                <Text fontSize="sm" fontWeight="semibold" truncate>
                  {displayName}
                </Text>
                <Text fontSize="xs" color="gray.500" truncate>
                  {displayEmail}
                </Text>
              </VStack>
            </HStack>
            <Menu.Separator />
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
