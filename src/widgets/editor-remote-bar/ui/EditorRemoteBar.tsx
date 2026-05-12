import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Box } from "@chakra-ui/react";

import {
  executionPollInterval,
  getLatestExecution,
  isExecutionInFlight,
  normalizeExecutionStatus,
  useExecuteWorkflowMutation,
  useRollbackExecutionMutation,
  useStopExecutionMutation,
  useWorkflowExecutionQuery,
  useWorkflowExecutionsQuery,
} from "@/entities";
import {
  type WorkflowNodeStatusResponse,
  type WorkflowResponse,
  getWorkflowTriggerSummary,
  useDeleteWorkflowMutation,
} from "@/entities/workflow";
import {
  useSaveWorkflowMutation,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { ROUTE_PATHS } from "@/shared";
import { getApiErrorMessage } from "@/shared/utils";
import { toaster } from "@/shared/utils/toaster/toaster";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ExecutionStatusBadge } from "./ExecutionStatusBadge";
import { RollbackActionButton } from "./RollbackActionButton";
import { RunStopSplitButton } from "./RunStopSplitButton";
import { SaveStateButton } from "./SaveStateButton";
import { TriggerControlButton } from "./TriggerControlButton";
import { TriggerSettingsPanel } from "./TriggerSettingsPanel";
import { WorkflowHeaderControls } from "./WorkflowHeaderControls";

const getExecutableBlockers = (
  nodeStatuses:
    | Array<Pick<WorkflowNodeStatusResponse, "executable">>
    | undefined
    | null,
) => (nodeStatuses ?? []).filter((nodeStatus) => !nodeStatus.executable);

const getExecutionBlockerMessage = (blockerCount: number) =>
  blockerCount === 1
    ? "저장 후 다시 확인한 결과 아직 실행할 수 없는 노드가 1개 있습니다."
    : `저장 후 다시 확인한 결과 아직 실행할 수 없는 노드가 ${blockerCount}개 있습니다.`;

/**
 * 에디터 하단 고정 리모컨 바.
 *
 * 참고: docs/EDITOR_REMOTE_BAR_DESIGN.md
 * Figma: https://www.figma.com/design/liTdK7QHV5tufaQW8DwV6U/Untitled?node-id=1882-3344
 *
 * 워크플로우 제목/관리 메뉴는 상단 헤더에 두고, 하단 바는 실행 관련
 * 컨트롤만 유지한다.
 */
export const EditorRemoteBar = () => {
  const navigate = useNavigate();

  const workflowId = useWorkflowStore((state) => state.workflowId);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const nodeStatuses = useWorkflowStore((state) => state.nodeStatuses);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeIds = useWorkflowStore((state) => state.endNodeIds);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const workflowTrigger = useWorkflowStore((state) => state.workflowTrigger);
  const workflowActive = useWorkflowStore((state) => state.workflowActive);
  const isDirty = useWorkflowStore((state) => state.isDirty);
  const canEditNodes = useWorkflowStore(
    (state) => state.editorCapabilities.canEditNodes,
  );
  const canSaveWorkflow = useWorkflowStore(
    (state) => state.editorCapabilities.canSaveWorkflow,
  );
  const canRunWorkflow = useWorkflowStore(
    (state) => state.editorCapabilities.canRunWorkflow,
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

  const [runPhase, setRunPhase] = useState<"idle" | "auto-saving" | "starting">(
    "idle",
  );
  const [trackedExecutionId, setTrackedExecutionId] = useState<string | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [triggerSettingsOpen, setTriggerSettingsOpen] = useState(false);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const { data: executions, refetch: refetchExecutions } =
    useWorkflowExecutionsQuery(workflowId || undefined, {
      enabled: Boolean(workflowId),
    });
  const { data: trackedExecution } = useWorkflowExecutionQuery(
    workflowId || undefined,
    trackedExecutionId ?? undefined,
    {
      enabled: Boolean(workflowId && trackedExecutionId),
      refetchInterval: (query) => {
        if (!trackedExecutionId) {
          return false;
        }

        const currentExecution = query.state.data;
        if (!currentExecution) {
          return executionPollInterval;
        }

        return isExecutionInFlight(currentExecution.state)
          ? executionPollInterval
          : false;
      },
    },
  );

  const activeExecution =
    trackedExecution ??
    (trackedExecutionId ? null : getLatestExecution(executions));
  const activeExecutionStatus = activeExecution
    ? normalizeExecutionStatus(activeExecution.state)
    : "idle";
  const effectiveRunPhase =
    runPhase === "starting" && trackedExecution ? "idle" : runPhase;
  const isRemoteExecutionInFlight =
    activeExecutionStatus === "pending" || activeExecutionStatus === "running";
  const isStarting = effectiveRunPhase === "starting";
  const isRunning = isStarting || isRemoteExecutionInFlight;
  const executableBlockers = useMemo(
    () => getExecutableBlockers(Object.values(nodeStatuses)),
    [nodeStatuses],
  );
  const triggerSummary = useMemo(
    () => getWorkflowTriggerSummary(workflowTrigger, workflowActive),
    [workflowActive, workflowTrigger],
  );
  const triggerControlActive =
    workflowActive && workflowTrigger.type !== "manual";
  const hasExecutableBlock = !isDirty && executableBlockers.length > 0;
  const executionStatusLabel =
    effectiveRunPhase === "auto-saving"
      ? "저장 중..."
      : effectiveRunPhase === "starting"
        ? "실행 시작 중..."
        : isRemoteExecutionInFlight
          ? "실행 중..."
          : hasExecutableBlock
            ? "실행 전에 설정 확인 필요"
            : null;

  const canRun =
    Boolean(workflowId) &&
    canRunWorkflow &&
    effectiveRunPhase === "idle" &&
    !isRemoteExecutionInFlight &&
    !isSavePending &&
    !isDeletePending &&
    !isExecutePending &&
    !isRollbackPending &&
    !hasExecutableBlock;
  const canStop =
    Boolean(workflowId) &&
    canRunWorkflow &&
    Boolean(activeExecution) &&
    !isStarting &&
    isRemoteExecutionInFlight;
  const canSave =
    Boolean(workflowId) &&
    canSaveWorkflow &&
    effectiveRunPhase === "idle" &&
    !isRemoteExecutionInFlight &&
    !isDeletePending;
  const canDelete =
    Boolean(workflowId) &&
    canEditNodes &&
    effectiveRunPhase === "idle" &&
    !isRemoteExecutionInFlight &&
    !isDeletePending;
  const canEditTrigger =
    Boolean(workflowId) &&
    canSaveWorkflow &&
    effectiveRunPhase === "idle" &&
    !isRemoteExecutionInFlight &&
    !isDeletePending;
  const canOpenRunMenu = Boolean(workflowId) && !isDeletePending && !isRunning;
  const canRollback =
    Boolean(workflowId) &&
    canRunWorkflow &&
    Boolean(activeExecution) &&
    activeExecutionStatus === "failed" &&
    !isRunning;

  useEffect(() => {
    if (
      !trackedExecutionId ||
      !trackedExecution ||
      isExecutionInFlight(trackedExecution.state)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRunPhase("idle");
      setTrackedExecutionId(null);
      void refetchExecutions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refetchExecutions, trackedExecution, trackedExecutionId]);

  const saveCurrentWorkflow = async (): Promise<WorkflowResponse> => {
    if (!workflowId) {
      throw new Error("workflowId is required");
    }

    return saveWorkflow({
      workflowId,
      store: {
        workflowName,
        workflowTrigger,
        workflowActive,
        nodes,
        edges,
        startNodeId,
        endNodeIds,
        endNodeId,
      },
    });
  };

  const handleRun = async () => {
    if (!workflowId || !canRun) {
      return;
    }

    if (isDirty) {
      setRunPhase("auto-saving");
      try {
        const savedWorkflow = await saveCurrentWorkflow();
        const latestNodeStatuses = savedWorkflow.nodeStatuses;

        if (!latestNodeStatuses) {
          setRunPhase("idle");
          toaster.create({
            title: "실행 준비 필요",
            description:
              "저장 후 최신 실행 가능 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
            type: "error",
          });
          return;
        }

        const latestExecutableBlockers =
          getExecutableBlockers(latestNodeStatuses);
        if (latestExecutableBlockers.length > 0) {
          setRunPhase("idle");
          toaster.create({
            title: "실행 전 설정 확인",
            description: getExecutionBlockerMessage(
              latestExecutableBlockers.length,
            ),
            type: "error",
          });
          return;
        }
      } catch {
        setRunPhase("idle");
        toaster.create({
          title: "저장 실패",
          description: "워크플로우 저장에 실패했습니다.",
          type: "error",
        });
        return;
      }
    }

    try {
      setTrackedExecutionId(null);
      setRunPhase("starting");
      const executionId = await executeWorkflow(workflowId);
      setTrackedExecutionId(executionId);
      void refetchExecutions();
    } catch (error) {
      setRunPhase("idle");
      toaster.create({
        title: "실행 실패",
        description: getApiErrorMessage(error),
        type: "error",
      });
    }
  };
  const handleStop = async () => {
    if (!workflowId || !activeExecution) {
      return;
    }

    try {
      await stopExecution({
        workflowId,
        executionId: activeExecution.id,
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
      await saveCurrentWorkflow();
    } catch {
      toaster.create({
        title: "저장 실패",
        description: "워크플로우 저장에 실패했습니다.",
        type: "error",
      });
    }
  };

  const handleOpenTriggerSettings = () => {
    if (!workflowId) {
      return;
    }

    setTriggerSettingsOpen(true);
  };

  const handleToggleTriggerSettings = () => {
    if (!workflowId) {
      return;
    }

    setTriggerSettingsOpen((open) => !open);
  };

  const handleCloseTriggerSettings = () => {
    setTriggerSettingsOpen(false);
  };

  const handleCheckBeforeRun = () => {
    if (!workflowId) {
      toaster.create({
        title: "워크플로우 정보 없음",
        description: "워크플로우 정보를 불러온 후 다시 확인해 주세요.",
        type: "error",
      });
      return;
    }

    if (!canRunWorkflow) {
      toaster.create({
        title: "실행 권한 없음",
        description: "이 워크플로우를 실행할 권한이 없습니다.",
        type: "error",
      });
      return;
    }

    if (isRunning) {
      toaster.create({
        title: "실행 중입니다",
        description: "실행이 끝난 뒤 현재 설정을 확인할 수 있습니다.",
      });
      return;
    }

    if (isDirty) {
      toaster.create({
        title: "저장 필요",
        description:
          "저장되지 않은 변경사항이 있습니다. 저장 후 최신 설정 상태를 확인해 주세요.",
      });
      return;
    }

    if (executableBlockers.length > 0) {
      toaster.create({
        title: "설정 확인 필요",
        description: getExecutionBlockerMessage(executableBlockers.length),
        type: "error",
      });
      return;
    }

    toaster.create({
      title: "실행 준비 완료",
      description: "현재 저장된 설정으로 워크플로우를 실행할 수 있습니다.",
    });
  };
  const handleRollback = async () => {
    if (!workflowId || !activeExecution || !canRollback) {
      return;
    }

    try {
      await rollbackExecution({
        workflowId,
        executionId: activeExecution.id,
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
    <>
      <WorkflowHeaderControls
        isRunning={isRunning}
        canSaveWorkflow={canSaveWorkflow}
        canDelete={canDelete}
        isDeletePending={isDeletePending}
        onOpenMenu={handleCloseTriggerSettings}
        onDelete={handleDeleteRequest}
      />

      <Box
        position="absolute"
        bottom={{ base: "16px", xl: "24px" }}
        left="50%"
        transform="translateX(-50%)"
        pointerEvents="none"
        zIndex={4}
        maxW="calc(100vw - 32px)"
      >
        <Box position="relative" pointerEvents="auto">
          <ExecutionStatusBadge label={executionStatusLabel} />
          <TriggerSettingsPanel
            open={triggerSettingsOpen}
            canEdit={canEditTrigger}
            anchorRef={triggerButtonRef}
            onClose={handleCloseTriggerSettings}
          />

          <Box
            display="flex"
            alignItems="center"
            gap={{ base: 1.5, xl: 2 }}
            width="fit-content"
            maxW="calc(100vw - 32px)"
            bg="bg.surface"
            border="1px solid"
            borderColor="border.default"
            borderRadius="xl"
            boxShadow="lg"
            px={{ base: 2, xl: 3 }}
            py={{ base: 1, xl: 1.5 }}
            overflow="clip"
            fontFamily="'Pretendard Variable', sans-serif"
            onWheel={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {canRollback ? (
              <RollbackActionButton
                isPending={isRollbackPending}
                onClick={() => void handleRollback()}
              />
            ) : null}

            <SaveStateButton
              isDirty={isDirty}
              isSaving={isSavePending}
              canSave={canSave}
              onSave={() => void handleSave()}
            />

            <TriggerControlButton
              ref={triggerButtonRef}
              summary={triggerSummary}
              active={triggerControlActive}
              onClick={handleToggleTriggerSettings}
            />

            <RunStopSplitButton
              isRunning={isRunning}
              isRunPending={isExecutePending || isStarting}
              isStopPending={isStopPending}
              canRun={canRun}
              canStop={canStop}
              canOpenMenu={canOpenRunMenu}
              onRun={() => void handleRun()}
              onStop={() => void handleStop()}
              onOpenMenu={handleCloseTriggerSettings}
              onOpenTriggerSettings={handleOpenTriggerSettings}
              onCheckBeforeRun={handleCheckBeforeRun}
            />
          </Box>
        </Box>
      </Box>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        workflowName={workflowName}
        isPending={isDeletePending}
        onCancel={handleDeleteCancel}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
};
