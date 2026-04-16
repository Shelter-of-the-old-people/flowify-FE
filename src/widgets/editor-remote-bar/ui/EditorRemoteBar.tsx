import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Box } from "@chakra-ui/react";

import {
  getLatestExecution,
  normalizeExecutionStatus,
  useExecuteWorkflowMutation,
  useRollbackExecutionMutation,
  useStopExecutionMutation,
  useWorkflowExecutionsQuery,
} from "@/entities";
import { useDeleteWorkflowMutation } from "@/entities/workflow";
import {
  useSaveWorkflowMutation,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { ROUTE_PATHS } from "@/shared";
import { toaster } from "@/shared/utils/toaster/toaster";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ExecutionStatusBadge } from "./ExecutionStatusBadge";
import { MiddleSlotButtons } from "./MiddleSlotButtons";
import { RunStopSplitButton } from "./RunStopSplitButton";
import { WorkflowNameField } from "./WorkflowNameField";

/**
 * 에디터 하단 고정 리모컨 바.
 *
 * 참고: docs/EDITOR_REMOTE_BAR_DESIGN.md
 * Figma: https://www.figma.com/design/liTdK7QHV5tufaQW8DwV6U/Untitled?node-id=1882-3344
 *
 * 기존 EditorToolbar의 모든 기능을 이전하고, 추가로 삭제 버튼과
 * 임시 3종 버튼(자동정렬/줌리셋/히스토리 — disabled)을 가운데 슬롯에 배치한다.
 */
export const EditorRemoteBar = () => {
  const navigate = useNavigate();

  const workflowId = useWorkflowStore((state) => state.workflowId);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const setExecutionStatus = useWorkflowStore(
    (state) => state.setExecutionStatus,
  );

  const { mutateAsync: saveWorkflow, isPending: isSavePending } =
    useSaveWorkflowMutation();
  const { mutateAsync: executeWorkflow, isPending: isExecutePending } =
    useExecuteWorkflowMutation();
  const { mutateAsync: stopExecution, isPending: isStopPending } =
    useStopExecutionMutation();
  const { mutateAsync: rollbackExecution, isPending: isRollbackPending } =
    useRollbackExecutionMutation();
  const { mutateAsync: deleteWorkflow, isPending: isDeletePending } =
    useDeleteWorkflowMutation();
  const { data: executions } = useWorkflowExecutionsQuery(
    workflowId || undefined,
    Boolean(workflowId),
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const latestExecution = getLatestExecution(executions);
  const latestExecutionStatus = latestExecution
    ? normalizeExecutionStatus(latestExecution.state)
    : "idle";
  const isRunning = latestExecutionStatus === "running";

  useEffect(() => {
    setExecutionStatus(latestExecutionStatus);
  }, [latestExecutionStatus, setExecutionStatus]);

  const canRun =
    Boolean(workflowId) &&
    !isRunning &&
    !isSavePending &&
    !isDeletePending &&
    !isRollbackPending;
  const canStop = Boolean(workflowId) && isRunning && Boolean(latestExecution);
  const canSave = Boolean(workflowId) && !isRunning && !isDeletePending;
  const canDelete = Boolean(workflowId) && !isRunning && !isDeletePending;
  const canRollback =
    Boolean(workflowId) &&
    Boolean(latestExecution) &&
    latestExecutionStatus === "failed" &&
    !isRunning;

  const handleRun = async () => {
    if (!workflowId || !canRun) {
      return;
    }

    try {
      setExecutionStatus("running");
      await executeWorkflow(workflowId);
    } catch {
      setExecutionStatus("failed");
      toaster.create({
        title: "실행 실패",
        description: "워크플로우 실행을 시작하지 못했습니다.",
        type: "error",
      });
    }
  };

  const handleStop = async () => {
    if (!workflowId || !latestExecution) {
      return;
    }

    try {
      await stopExecution({
        workflowId,
        executionId: latestExecution.id,
      });
    } catch {
      toaster.create({
        title: "중지 실패",
        description: "실행 중지를 요청하지 못했습니다.",
        type: "error",
      });
    }
  };

  const handleSave = async () => {
    if (!workflowId || !canSave) {
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
    } catch {
      toaster.create({
        title: "저장 실패",
        description: "워크플로우 저장에 실패했습니다.",
        type: "error",
      });
    }
  };

  const handleRollback = async () => {
    if (!workflowId || !latestExecution || !canRollback) {
      return;
    }

    try {
      await rollbackExecution({
        workflowId,
        executionId: latestExecution.id,
      });
    } catch {
      toaster.create({
        title: "롤백 실패",
        description: "롤백 요청에 실패했습니다.",
        type: "error",
      });
    }
  };

  const handleDeleteRequest = () => {
    if (!canDelete) {
      return;
    }

    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!workflowId) {
      return;
    }

    try {
      await deleteWorkflow(workflowId);
      setDeleteDialogOpen(false);
      navigate(ROUTE_PATHS.WORKFLOWS);
    } catch {
      setDeleteDialogOpen(false);
      toaster.create({
        title: "삭제 실패",
        description: "워크플로우 삭제에 실패했습니다. 다시 시도해 주세요.",
        type: "error",
      });
    }
  };

  return (
    <Box
      position="absolute"
      bottom="24px"
      left="50%"
      transform="translateX(-50%)"
      pointerEvents="none"
      zIndex={4}
    >
      <Box position="relative" pointerEvents="auto">
        <ExecutionStatusBadge status={latestExecutionStatus} />

        <Box
          display="flex"
          alignItems="center"
          gap="16px"
          width="900px"
          bg="#fefefe"
          border="1px solid #f2f2f2"
          borderRadius="20px"
          boxShadow="0px 4px 4px rgba(0, 0, 0, 0.25)"
          px="24px"
          py="8px"
          overflow="clip"
          fontFamily="'Pretendard Variable', sans-serif"
          onWheel={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Box display="flex" alignItems="center" flexShrink={0}>
            <WorkflowNameField disabled={isRunning} />
          </Box>

          <MiddleSlotButtons
            isDeletePending={isDeletePending}
            isRollbackPending={isRollbackPending}
            canDelete={canDelete}
            canRollback={canRollback}
            onDelete={handleDeleteRequest}
            onRollback={() => void handleRollback()}
          />

          <RunStopSplitButton
            isRunning={isRunning}
            isRunPending={isExecutePending}
            isStopPending={isStopPending}
            isSavePending={isSavePending}
            canRun={canRun}
            canStop={canStop}
            canSave={canSave}
            onRun={() => void handleRun()}
            onStop={() => void handleStop()}
            onSave={() => void handleSave()}
          />
        </Box>
      </Box>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        workflowName={workflowName}
        isPending={isDeletePending}
        onCancel={handleDeleteCancel}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </Box>
  );
};
