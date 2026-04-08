import { useRef, useState } from "react";
import { MdCheck, MdPlayArrow, MdRefresh, MdSave } from "react-icons/md";

import { Box, IconButton, Input, Spinner, Text } from "@chakra-ui/react";

import type { ExecutionStatus } from "@/shared";
import { useWorkflowStore } from "@/shared";

interface RunButtonConfig {
  colorPalette: string;
  icon: React.ReactNode;
  disabled: boolean;
}

type EditorToolbarProps = {
  variant?: "bar" | "overlay";
};

const getRunButtonConfig = (status: ExecutionStatus): RunButtonConfig => {
  switch (status) {
    case "running":
      return {
        colorPalette: "yellow",
        icon: <Spinner size="xs" />,
        disabled: true,
      };
    case "failed":
      return {
        colorPalette: "red",
        icon: <MdRefresh />,
        disabled: false,
      };
    case "idle":
    case "success":
    default:
      return {
        colorPalette: "green",
        icon: <MdPlayArrow />,
        disabled: false,
      };
  }
};

const WorkflowNameEditor = () => {
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const setWorkflowName = useWorkflowStore((state) => state.setWorkflowName);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = workflowName || "새 워크플로우";

  const handleStartEdit = () => {
    setInputValue(workflowName);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
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
      <Box display="flex" alignItems="center" gap={1}>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onBlur={handleConfirm}
          onKeyDown={handleKeyDown}
          size="sm"
          width="200px"
          fontWeight="semibold"
          bg="white"
        />
        <IconButton
          aria-label="이름 저장"
          size="xs"
          variant="ghost"
          onClick={handleConfirm}
        >
          <MdCheck />
        </IconButton>
      </Box>
    );
  }

  return (
    <Text
      fontWeight="semibold"
      fontSize="sm"
      cursor="pointer"
      px={2}
      py={1}
      borderRadius="md"
      bg="whiteAlpha.900"
      boxShadow="0 8px 24px rgba(15, 23, 42, 0.08)"
      _hover={{ bg: "white" }}
      onClick={handleStartEdit}
      title="클릭해 이름 편집"
    >
      {displayName}
    </Text>
  );
};

export const EditorToolbar = ({ variant = "bar" }: EditorToolbarProps) => {
  const executionStatus = useWorkflowStore((state) => state.executionStatus);
  const runConfig = getRunButtonConfig(executionStatus);
  const isOverlay = variant === "overlay";

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      height={isOverlay ? "auto" : "48px"}
      px={isOverlay ? 4 : 4}
      py={isOverlay ? 3 : 0}
      bg={isOverlay ? "transparent" : "bg.surface"}
      borderBottom={isOverlay ? "none" : "1px solid"}
      borderColor="border.default"
      flexShrink={0}
      position={isOverlay ? "absolute" : "relative"}
      top={isOverlay ? 0 : undefined}
      left={isOverlay ? 0 : undefined}
      right={isOverlay ? 0 : undefined}
      zIndex={isOverlay ? 4 : undefined}
      pointerEvents={isOverlay ? "none" : "auto"}
    >
      <Box pointerEvents="auto">
        <WorkflowNameEditor />
      </Box>
      <Box display="flex" gap={2} pointerEvents="auto">
        <IconButton
          aria-label="워크플로우 실행"
          size="sm"
          colorPalette={runConfig.colorPalette}
          disabled={runConfig.disabled}
          bg="white"
          boxShadow="0 8px 24px rgba(15, 23, 42, 0.08)"
        >
          {runConfig.icon}
        </IconButton>
        <IconButton
          aria-label="워크플로우 저장"
          size="sm"
          variant="outline"
          bg="white"
          boxShadow="0 8px 24px rgba(15, 23, 42, 0.08)"
        >
          <MdSave />
        </IconButton>
      </Box>
    </Box>
  );
};
