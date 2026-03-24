import { useRef, useState } from "react";
import { MdCheck, MdPlayArrow, MdRefresh, MdSave } from "react-icons/md";

import { Box, IconButton, Input, Spinner, Text } from "@chakra-ui/react";

import type { ExecutionStatus } from "@/shared";
import { useWorkflowStore } from "@/shared";

// ─── 실행 버튼 설정 ───────────────────────────────────────────
interface RunButtonConfig {
  colorPalette: string;
  icon: React.ReactNode;
  disabled: boolean;
}

const getRunButtonConfig = (status: ExecutionStatus): RunButtonConfig => {
  switch (status) {
    case "running":
      return {
        colorPalette: "yellow",
        icon: <Spinner size="xs" />,
        disabled: true,
      };
    case "failed":
      return { colorPalette: "red", icon: <MdRefresh />, disabled: false };
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

// ─── 이름 인라인 편집 컴포넌트 ───────────────────────────────
const WorkflowNameEditor = () => {
  const workflowName = useWorkflowStore((s) => s.workflowName);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  };

  if (isEditing) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleConfirm}
          onKeyDown={handleKeyDown}
          size="sm"
          width="200px"
          fontWeight="semibold"
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
      _hover={{ bg: "bg.subtle" }}
      onClick={handleStartEdit}
      title="클릭하여 이름 편집"
    >
      {displayName}
    </Text>
  );
};

// ─── EditorToolbar ────────────────────────────────────────────
export const EditorToolbar = () => {
  const executionStatus = useWorkflowStore((s) => s.executionStatus);
  const runConfig = getRunButtonConfig(executionStatus);

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      height="48px"
      px={4}
      bg="bg.surface"
      borderBottom="1px solid"
      borderColor="border.default"
      flexShrink={0}
    >
      <WorkflowNameEditor />
      <Box display="flex" gap={2}>
        <IconButton
          aria-label="워크플로우 실행"
          size="sm"
          colorPalette={runConfig.colorPalette}
          disabled={runConfig.disabled}
        >
          {runConfig.icon}
        </IconButton>
        <IconButton aria-label="워크플로우 저장" size="sm" variant="outline">
          <MdSave />
        </IconButton>
      </Box>
    </Box>
  );
};
