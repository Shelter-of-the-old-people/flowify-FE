import { type ElementType } from "react";
import {
  MdAutoFixHigh,
  MdDeleteOutline,
  MdHistory,
  MdMoreHoriz,
  MdZoomOutMap,
} from "react-icons/md";

import { Button, Icon, Menu, Portal, Text } from "@chakra-ui/react";

type WorkflowToolMenuButtonProps = {
  isDeletePending: boolean;
  canDelete: boolean;
  onOpenMenu?: () => void;
  onDelete: () => void;
};

type ToolMenuItemProps = {
  value: string;
  label: string;
  icon: ElementType;
  disabled?: boolean;
  tone?: "default" | "danger";
  onSelect?: () => void;
};

const ToolMenuItem = ({
  value,
  label,
  icon,
  disabled = false,
  tone = "default",
  onSelect,
}: ToolMenuItemProps) => {
  const isDanger = tone === "danger";

  return (
    <Menu.Item
      value={value}
      disabled={disabled}
      color={isDanger ? "status.error" : "text.primary"}
      onSelect={onSelect}
    >
      <Icon as={icon} boxSize={4} />
      <Text as="span" fontSize="sm">
        {label}
      </Text>
    </Menu.Item>
  );
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
    positioning={{ placement: "top-end" }}
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
          minW="168px"
          p={1.5}
          bg="bg.surface"
          border="1px solid"
          borderRadius="xl"
          borderColor="border.default"
          boxShadow="lg"
        >
          <ToolMenuItem
            value="history"
            label="히스토리"
            icon={MdHistory}
            disabled
          />
          <ToolMenuItem
            value="auto-layout"
            label="자동 정렬"
            icon={MdAutoFixHigh}
            disabled
          />
          <ToolMenuItem
            value="zoom-reset"
            label="화면 맞춤"
            icon={MdZoomOutMap}
            disabled
          />
          <Menu.Separator />
          <ToolMenuItem
            value="delete"
            label={isDeletePending ? "삭제 중..." : "삭제"}
            icon={MdDeleteOutline}
            disabled={!canDelete || isDeletePending}
            tone="danger"
            onSelect={onDelete}
          />
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  </Menu.Root>
);
