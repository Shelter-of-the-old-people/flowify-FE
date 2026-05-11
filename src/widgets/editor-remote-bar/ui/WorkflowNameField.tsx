import { useRef, useState } from "react";

import { Input, Text } from "@chakra-ui/react";

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
        width={{ base: "140px", lg: "180px", xl: "220px" }}
        height="24px"
        px={2}
        py={0}
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="medium"
        fontSize="sm"
        color="text.primary"
        bg="bg.surface"
        border="1px solid"
        borderColor="border.default"
        borderRadius="md"
        _focus={{ borderColor: "border.selected", boxShadow: "none" }}
      />
    );
  }

  return (
    <Text
      as="p"
      fontFamily="'Pretendard Variable', sans-serif"
      fontWeight="medium"
      fontSize="sm"
      color="text.primary"
      maxW={{ base: "120px", lg: "160px", xl: "220px" }}
      overflow="hidden"
      textOverflow="ellipsis"
      whiteSpace="nowrap"
      cursor={disabled ? "default" : "pointer"}
      opacity={disabled ? 0.6 : 1}
      onClick={handleStartEdit}
      title={disabled ? disabledReason : "클릭하여 이름 수정"}
    >
      {displayName}
    </Text>
  );
};
