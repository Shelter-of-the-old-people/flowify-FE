import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { Box } from "@chakra-ui/react";
import { useIsMutating } from "@tanstack/react-query";

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
  getWorkflowTriggerDisplayLabel,
  normalizeWorkflowTrigger,
  useDeleteWorkflowMutation,
  useToggleWorkflowActiveMutation,
  workflowMutationKeys,
} from "@/entities/workflow";
import {
  useWorkflowAutosave,
  useWorkflowStore,
} from "@/features/workflow-editor";
import { ROUTE_PATHS } from "@/shared";
import { getApiErrorMessage } from "@/shared/utils";
import { toaster } from "@/shared/utils/toaster/toaster";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ExecutionStatusBadge } from "./ExecutionStatusBadge";
import { RollbackActionButton } from "./RollbackActionButton";
import {
  type PrimaryRunActionKind,
  RunStopSplitButton,
} from "./RunStopSplitButton";
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
    ? "실행 전에 설정 확인이 필요한 노드가 1개 있습니다."
    : `실행 전에 설정 확인이 필요한 노드가 ${blockerCount}개 있습니다.`;

export const EditorRemoteBar = () => {
  const navigate = useNavigate();

  const workflowId = useWorkflowStore((state) => state.workflowId);
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const nodeStatuses = useWorkflowStore((state) => state.nodeStatuses);
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

  const { mutateAsync: executeWorkflow, isPending: isExecutePending } =
    useExecuteWorkflowMutation();
  const { mutateAsync: stopExecution, isPending: isStopPending } =
    useStopExecutionMutation();
  const { mutateAsync: rollbackExecution, isPending: isRollbackPending } =
    useRollbackExecutionMutation();
  const { mutateAsync: deleteWorkflow, isPending: isDeletePending } =
    useDeleteWorkflowMutation();
  const {
    mutateAsync: toggleWorkflowActive,
    isPending: isToggleWorkflowActivePending,
  } = useToggleWorkflowActiveMutation({
    onSuccess: (workflow) => {
      useWorkflowStore.getState().syncWorkflowActive(workflow.active);
    },
  });
  const structureMutationCount = useIsMutating({
    mutationKey: workflowMutationKeys.structure,
  });
  const nodeConfigMutationCount = useIsMutating({
    mutationKey: workflowMutationKeys.nodeConfig,
  });
  const blockingWorkflowMutationCount =
    structureMutationCount + nodeConfigMutationCount;

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
  const normalizedWorkflowTrigger = useMemo(
    () => normalizeWorkflowTrigger(workflowTrigger),
    [workflowTrigger],
  );
  const isScheduledTrigger = normalizedWorkflowTrigger.type === "schedule";
  const triggerSummary = useMemo(
    () => getWorkflowTriggerDisplayLabel(workflowTrigger),
    [workflowTrigger],
  );
  const triggerControlActive = workflowActive && isScheduledTrigger;
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
  const { saveStatus, saveErrorMessage, flushSave } = useWorkflowAutosave({
    enabled:
      Boolean(workflowId) &&
      canSaveWorkflow &&
      effectiveRunPhase === "idle" &&
      !isRemoteExecutionInFlight &&
      !isDeletePending,
  });

  const canRun =
    Boolean(workflowId) &&
    canRunWorkflow &&
    effectiveRunPhase === "idle" &&
    !isRemoteExecutionInFlight &&
    blockingWorkflowMutationCount === 0 &&
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
    !isDeletePending &&
    blockingWorkflowMutationCount === 0;
  const canToggleWorkflowActive =
    Boolean(workflowId) &&
    canSaveWorkflow &&
    !isDeletePending &&
    blockingWorkflowMutationCount === 0 &&
    !isToggleWorkflowActivePending;
  const canRollback =
    Boolean(workflowId) &&
    canRunWorkflow &&
    Boolean(activeExecution) &&
    activeExecutionStatus === "failed" &&
    !isRunning;
  const primaryActionKind: PrimaryRunActionKind = isScheduledTrigger
    ? isRunning
      ? workflowActive
        ? "disable-auto-run-and-stop"
        : "stop"
      : workflowActive
        ? "disable-auto-run"
        : "enable-auto-run"
    : isRunning
      ? "stop"
      : "run";
  const primaryLabel =
    primaryActionKind === "run"
      ? "실행"
      : primaryActionKind === "stop"
        ? "중지"
        : primaryActionKind === "enable-auto-run"
          ? "자동실행 켜기"
          : primaryActionKind === "disable-auto-run-and-stop"
            ? "자동실행 끄고 중지"
            : "자동실행 끄기";
  const isPrimaryPending =
    primaryActionKind === "run"
      ? isExecutePending || isStarting
      : primaryActionKind === "stop"
        ? isStopPending
        : primaryActionKind === "disable-auto-run-and-stop"
          ? isToggleWorkflowActivePending || isStopPending
          : isToggleWorkflowActivePending;
  const canPrimaryAction =
    primaryActionKind === "run"
      ? canRun
      : primaryActionKind === "stop"
        ? canStop
        : primaryActionKind === "disable-auto-run-and-stop"
          ? canToggleWorkflowActive && canStop
          : canToggleWorkflowActive && effectiveRunPhase === "idle";
  const showTestButton = isScheduledTrigger;

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

  const ensureWorkflowReadyForExecution = async () => {
    const shouldFlushBeforeRun =
      isDirty || saveStatus === "scheduled" || saveStatus === "saving";

    if (shouldFlushBeforeRun) {
      setRunPhase("auto-saving");

      const savedWorkflow = await flushSave();
      if (useWorkflowStore.getState().isDirty) {
        setRunPhase("idle");
        toaster.create({
          title: "저장 실패",
          description:
            "워크플로우 저장에 실패했습니다. 저장 후 다시 실행해 주세요.",
          type: "error",
        });
        return false;
      }

      const latestNodeStatuses =
        savedWorkflow?.nodeStatuses ??
        Object.values(useWorkflowStore.getState().nodeStatuses);
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
        return false;
      }

      setRunPhase("idle");
      return true;
    }

    if (executableBlockers.length > 0) {
      toaster.create({
        title: "실행 전 설정 확인",
        description: getExecutionBlockerMessage(executableBlockers.length),
        type: "error",
      });
      return false;
    }

    return true;
  };

  const handleRun = async () => {
    if (!workflowId || !canRun) {
      return;
    }

    const readyForExecution = await ensureWorkflowReadyForExecution();
    if (!readyForExecution) {
      setRunPhase("idle");
      return;
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
      return false;
    }

    try {
      await stopExecution({
        workflowId,
        executionId: activeExecution.id,
      });
      return true;
    } catch {
      toaster.create({
        title: "중지 실패",
        description: "실행 중지를 요청하지 못했습니다.",
        type: "error",
      });
      return false;
    }
  };

  const handleToggleWorkflowActive = async (
    active: boolean,
    options?: { silentSuccess?: boolean },
  ) => {
    if (!workflowId) {
      return false;
    }

    try {
      const workflow = await toggleWorkflowActive({ workflowId, active });
      useWorkflowStore.getState().syncWorkflowActive(workflow.active);

      if (!options?.silentSuccess) {
        toaster.create({
          title: active ? "자동실행 켜짐" : "자동실행 꺼짐",
          description: active
            ? "설정한 주기대로 워크플로우를 실행합니다."
            : "예약된 자동실행을 중지했습니다.",
        });
      }

      return true;
    } catch (error) {
      toaster.create({
        title: "자동실행 변경 실패",
        description: getApiErrorMessage(error),
        type: "error",
      });
      return false;
    }
  };

  const handlePrimaryAction = async () => {
    if (!canPrimaryAction) {
      return;
    }

    if (primaryActionKind === "run") {
      await handleRun();
      return;
    }

    if (primaryActionKind === "stop") {
      await handleStop();
      return;
    }

    if (primaryActionKind === "enable-auto-run") {
      const readyForExecution = await ensureWorkflowReadyForExecution();
      if (!readyForExecution) {
        setRunPhase("idle");
        return;
      }

      await handleToggleWorkflowActive(true);
      return;
    }

    if (primaryActionKind === "disable-auto-run-and-stop") {
      const disabled = await handleToggleWorkflowActive(false, {
        silentSuccess: true,
      });
      if (!disabled) {
        return;
      }

      const stopped = await handleStop();
      toaster.create({
        title: stopped ? "자동실행 중지 완료" : "자동실행 꺼짐",
        description: stopped
          ? "자동실행을 끄고 현재 실행을 중지했습니다."
          : "자동실행은 꺼졌지만 현재 실행 중지는 실패했습니다.",
        type: stopped ? "success" : "warning",
      });
      return;
    }

    await handleToggleWorkflowActive(false);
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
        saveStatus={saveStatus}
        saveErrorMessage={saveErrorMessage}
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

            <TriggerControlButton
              ref={triggerButtonRef}
              summary={triggerSummary}
              active={triggerControlActive}
              onClick={handleToggleTriggerSettings}
            />

            <RunStopSplitButton
              primaryActionKind={primaryActionKind}
              primaryLabel={primaryLabel}
              isPrimaryPending={isPrimaryPending}
              canPrimaryAction={canPrimaryAction}
              showTestButton={showTestButton}
              isTestPending={isExecutePending || isStarting}
              canTestRun={canRun}
              onPrimaryAction={() => void handlePrimaryAction()}
              onTestRun={() => void handleRun()}
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
