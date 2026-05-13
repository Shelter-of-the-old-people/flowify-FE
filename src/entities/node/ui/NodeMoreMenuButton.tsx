import { MdDeleteOutline, MdMoreHoriz } from "react-icons/md";

import { Button, Icon, Menu, Portal, Text } from "@chakra-ui/react";

type NodeMoreMenuButtonProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};

export const NodeMoreMenuButton = ({
  open,
  onOpenChange,
  onDelete,
}: NodeMoreMenuButtonProps) => (
  <Menu.Root
    lazyMount
    unmountOnExit
    open={open}
    positioning={{ placement: "bottom-end" }}
    onOpenChange={(details) => onOpenChange(details.open)}
  >
    <Menu.Trigger asChild>
      <Button
        type="button"
        aria-label="노드 메뉴 열기"
        title="노드 메뉴"
        className="nodrag nopan"
        height="26px"
        minW="26px"
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
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Icon as={MdMoreHoriz} boxSize={4} />
      </Button>
    </Menu.Trigger>

    <Portal>
      <Menu.Positioner zIndex={30}>
        <Menu.Content
          className="nodrag nopan"
          minW="128px"
          p={1.5}
          bg="bg.surface"
          border="1px solid"
          borderRadius="xl"
          borderColor="border.default"
          boxShadow="lg"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Menu.Item
            value="delete"
            color="status.error"
            onSelect={() => {
              onOpenChange(false);
              onDelete();
            }}
          >
            <Icon as={MdDeleteOutline} boxSize={4} />
            <Text as="span" fontSize="sm">
              삭제
            </Text>
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
