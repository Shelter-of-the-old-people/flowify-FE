import { type KeyboardEvent, useRef, useState } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";

import { Button, Icon, Input, Text } from "@chakra-ui/react";

import { useWorkflowStore } from "@/features/workflow-editor";

type WorkflowNameFieldProps = {
  disabled?: boolean;
  disabledReason?: string;
};

export const WorkflowNameField = ({
  disabled = false,
  disabledReason = "실행 중에는 편집할 수 없습니다",
}: WorkflowNameFieldProps) => {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = workflowName || "새 워크플로우";

  const handleStartEdit = () => {
    if (disabled) {
      return;
    }

    setInputValue(workflowName);
    setIsEditing(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleConfirm = () => {
    const trimmed = inputValue.trim();

    if (trimmed) {
      setWorkflowName(trimmed);
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleConfirm();
    }

    if (event.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={handleConfirm}
        onKeyDown={handleKeyDown}
        size="sm"
        width={{ base: "160px", lg: "200px", xl: "240px" }}
        height="34px"
        px={3}
        py={0}
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="medium"
        fontSize="sm"
        color="text.primary"
        bg="bg.surface"
        border="1px solid"
        borderColor="border.selected"
        borderRadius="lg"
        _focus={{ borderColor: "border.selected", boxShadow: "none" }}
      />
    );
  }

  return (
    <Button
      type="button"
      display="flex"
      alignItems="center"
      gap={1.5}
      height="34px"
      maxW={{ base: "150px", lg: "200px", xl: "260px" }}
      px={{ base: 2, xl: 3 }}
      bg="bg.surface"
      color="text.primary"
      border="1px solid"
      borderColor="border.default"
      borderRadius="lg"
      fontFamily="'Pretendard Variable', sans-serif"
      cursor={disabled ? "default" : "pointer"}
      opacity={disabled ? 0.6 : 1}
      onClick={handleStartEdit}
      title={disabled ? disabledReason : "워크플로우 이름 수정"}
      aria-label={disabled ? disabledReason : "워크플로우 이름 수정"}
      _hover={
        disabled
          ? { bg: "bg.surface" }
          : { bg: "bg.overlay", borderColor: "border.strong" }
      }
      _active={disabled ? { bg: "bg.surface" } : { bg: "neutral.200" }}
    >
      <Text
        as="span"
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="semibold"
        fontSize="sm"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {displayName}
      </Text>
      <Icon as={MdKeyboardArrowDown} boxSize={4} color="text.secondary" />
    </Button>
  );
};
