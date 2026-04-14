import { useEffect, useRef, useState } from "react";
import { type ReactNode } from "react";
import { MdCheck, MdPlayArrow, MdRefresh, MdSave } from "react-icons/md";

import {
  Box,
  Button,
  IconButton,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";

import {
  type ExecutionStatus,
  getLatestExecution,
  normalizeExecutionStatus,
  useExecuteWorkflowMutation,
  useRollbackExecutionMutation,
  useWorkflowExecutionsQuery,
} from "@/entities";
import { useSaveWorkflowMutation } from "@/features/workflow-editor";
import { useWorkflowStore } from "@/features/workflow-editor";

interface RunButtonConfig {
  colorPalette: string;
  icon: ReactNode;
  disabled: boolean;
}

type EditorToolbarProps = {
  variant?: "bar" | "overlay";
};

const getRunButtonConfig = (status: ExecutionStatus): RunButtonConfig => {
  switch (status) {
    case "pending":
    case "running":
      return {
        colorPalette: "yellow",
        icon: <Spinner size="xs" />,
        disabled: true,
      };
    case "rollback_available":
      return {
        colorPalette: "orange",
        icon: <MdRefresh />,
        disabled: false,
      };
    case "stopped":
      return {
        colorPalette: "gray",
        icon: <MdPlayArrow />,
        disabled: false,
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

const getExecutionMessage = (status: ExecutionStatus | null) => {
  switch (status) {
    case "pending":
      return "최근 실행 대기 중";
    case "running":
      return "최근 실행 진행 중";
    case "success":
      return "최근 실행 성공";
    case "failed":
      return "최근 실행 실패";
    case "rollback_available":
      return "최근 실행 실패, 롤백 가능";
    case "stopped":
      return "최근 실행이 중지됨";
    case "idle":
    case null:
    default:
      return "실행 이력이 아직 없습니다";
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
      title="클릭 뒤 이름 수정"
    >
      {displayName}
    </Text>
  );
};

export const EditorToolbar = ({ variant = "bar" }: EditorToolbarProps) => {
  const executionStatus = useWorkflowStore((state) => state.executionStatus);
  const setExecutionStatus = useWorkflowStore(
    (state) => state.setExecutionStatus,
  );
  const workflowId = useWorkflowStore((state) => state.workflowId);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const { mutateAsync: saveWorkflow, isPending: isSavePending } =
    useSaveWorkflowMutation();
  const { mutateAsync: executeWorkflow, isPending: isExecutePending } =
    useExecuteWorkflowMutation();
  const { mutateAsync: rollbackExecution, isPending: isRollbackPending } =
    useRollbackExecutionMutation();
  const { data: executions } = useWorkflowExecutionsQuery(
    workflowId || undefined,
    Boolean(workflowId),
  );
  const [saveState, setSaveState] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const latestExecution = getLatestExecution(executions);
  const latestExecutionStatus = latestExecution
    ? normalizeExecutionStatus(latestExecution.state)
    : null;
  const runConfig = getRunButtonConfig(
    latestExecutionStatus ?? executionStatus,
  );
  const isOverlay = variant === "overlay";

  useEffect(() => {
    if (saveState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveState("idle");
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveState]);

  useEffect(() => {
    if (!latestExecutionStatus) {
      return;
    }

    setExecutionStatus(latestExecutionStatus);
  }, [latestExecutionStatus, setExecutionStatus]);

  const handleSave = async () => {
    if (!workflowId) {
      return;
    }

    try {
      await saveWorkflow({
        workflowId,
        store: {
          workflowName,
          nodes,
          edges,
          startNodeId,
          endNodeId,
        },
      });
      setSaveState("success");
    } catch {
      setSaveState("error");
    }
  };

  const handleRun = async () => {
    if (!workflowId) {
      return;
    }

    try {
      setExecutionStatus("running");
      await executeWorkflow(workflowId);
    } catch {
      setExecutionStatus("failed");
    }
  };

  const handleRollback = async () => {
    if (!workflowId || !latestExecution) {
      return;
    }

    try {
      await rollbackExecution({
        workflowId,
        executionId: latestExecution.id,
      });
    } catch {
      setExecutionStatus("failed");
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      height={isOverlay ? "auto" : "48px"}
      px={4}
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

      <Box display="flex" gap={2} alignItems="center" pointerEvents="auto">
        <Text fontSize="xs" color="gray.500" fontWeight="medium">
          {getExecutionMessage(latestExecutionStatus)}
        </Text>

        {saveState === "success" ? (
          <Text fontSize="xs" color="green.600" fontWeight="semibold">
            저장 완료
          </Text>
        ) : null}

        {saveState === "error" ? (
          <Text fontSize="xs" color="red.500" fontWeight="semibold">
            저장 실패
          </Text>
        ) : null}

        <IconButton
          aria-label="워크플로우 실행"
          size="sm"
          colorPalette={runConfig.colorPalette}
          disabled={
            runConfig.disabled ||
            !workflowId ||
            isExecutePending ||
            isSavePending
          }
          bg="white"
          boxShadow="0 8px 24px rgba(15, 23, 42, 0.08)"
          onClick={() => void handleRun()}
        >
          {isExecutePending ? <Spinner size="xs" /> : runConfig.icon}
        </IconButton>

        {latestExecutionStatus === "rollback_available" ? (
          <Button
            size="sm"
            variant="outline"
            bg="white"
            disabled={!workflowId || !latestExecution || isRollbackPending}
            onClick={() => void handleRollback()}
          >
            {isRollbackPending ? "롤백 중..." : "롤백"}
          </Button>
        ) : null}

        <IconButton
          aria-label="워크플로우 저장"
          size="sm"
          variant="outline"
          bg="white"
          boxShadow="0 8px 24px rgba(15, 23, 42, 0.08)"
          disabled={!workflowId || isSavePending}
          onClick={() => void handleSave()}
        >
          {isSavePending ? <Spinner size="xs" /> : <MdSave />}
        </IconButton>
      </Box>
    </Box>
  );
};
