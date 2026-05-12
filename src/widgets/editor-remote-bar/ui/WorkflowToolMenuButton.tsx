import { MdDeleteOutline, MdMoreHoriz } from "react-icons/md";

import { Button, Icon, Menu, Portal, Text } from "@chakra-ui/react";

type WorkflowToolMenuButtonProps = {
  isDeletePending: boolean;
  canDelete: boolean;
  onOpenMenu?: () => void;
  onDelete: () => void;
};

export const WorkflowToolMenuButton = ({
  isDeletePending,
  canDelete,
  onOpenMenu,
  onDelete,
}: WorkflowToolMenuButtonProps) => (
  <Menu.Root
    lazyMount
    unmountOnExit
    positioning={{ placement: "bottom-start" }}
    onOpenChange={(details) => {
      if (details.open) {
        onOpenMenu?.();
      }
    }}
  >
    <Menu.Trigger asChild>
      <Button
        type="button"
        aria-label="도구 메뉴 열기"
        title="도구 메뉴"
        height="30px"
        minW="30px"
        px={0}
        bg="bg.surface"
        color="text.primary"
        border="1px solid"
        borderColor="border.default"
        borderRadius="lg"
        flexShrink={0}
        _hover={{ bg: "bg.overlay", borderColor: "border.strong" }}
        _active={{ bg: "neutral.200" }}
        _expanded={{ bg: "bg.overlay", borderColor: "border.strong" }}
      >
        <Icon as={MdMoreHoriz} boxSize={4.5} />
      </Button>
    </Menu.Trigger>

    <Portal>
      <Menu.Positioner zIndex={20}>
        <Menu.Content
          minW="128px"
          p={1.5}
          bg="bg.surface"
          border="1px solid"
          borderRadius="xl"
          borderColor="border.default"
          boxShadow="lg"
        >
          <Menu.Item
            value="delete"
            disabled={!canDelete || isDeletePending}
            onSelect={onDelete}
            color="status.error"
          >
            <Icon as={MdDeleteOutline} boxSize={4} />
            <Text as="span" fontSize="sm">
              {isDeletePending ? "삭제 중..." : "삭제"}
            </Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
