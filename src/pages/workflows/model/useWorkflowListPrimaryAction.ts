import { useMemo } from "react";

import {
  type WorkflowResponse,
  useToggleWorkflowActiveMutation,
} from "@/entities/workflow";
import { useWorkflowExecutionAction } from "@/features/workflow-execution";
import { getAuthUser } from "@/shared";
import { getApiErrorMessage, toaster } from "@/shared/utils";

import {
  canToggleWorkflowAutoRun,
  getWorkflowListPrimaryActionKind,
  getWorkflowListPrimaryActionLabel,
  getWorkflowListTriggerDisplayLabel,
} from "./workflow-list";

export const useWorkflowListPrimaryAction = (workflow: WorkflowResponse) => {
  const viewerUserId = getAuthUser()?.id ?? null;
  const executionAction = useWorkflowExecutionAction(workflow.id);
  const canToggleAutoRun = useMemo(
    () => canToggleWorkflowAutoRun(workflow, viewerUserId),
    [viewerUserId, workflow],
  );
  const primaryActionKind = useMemo(
    () => getWorkflowListPrimaryActionKind(workflow, executionAction.isRunning),
    [executionAction.isRunning, workflow],
  );
  const { mutateAsync: toggleWorkflowActive, isPending: isTogglePending } =
    useToggleWorkflowActiveMutation({
      showErrorToast: false,
    });

  const isPrimaryActionPending =
    executionAction.isActionPending || isTogglePending;
  const canUsePrimaryAction =
    primaryActionKind === "run" || primaryActionKind === "stop"
      ? !isPrimaryActionPending
      : canToggleAutoRun && !isPrimaryActionPending;

  const toggleAutoRun = async (active: boolean, silentSuccess = false) => {
    if (!canToggleAutoRun || isTogglePending) {
      return false;
    }

    try {
      await toggleWorkflowActive({
        workflowId: workflow.id,
        active,
      });

      if (!silentSuccess) {
        toaster.create({
          type: "success",
          title: active ? "자동실행 켜짐" : "자동실행 꺼짐",
          description: active
            ? "다음 주기부터 자동실행을 시작합니다."
            : "다음 주기부터 자동실행을 멈춥니다.",
        });
      }

      return true;
    } catch (error) {
      const errorMessage = getApiErrorMessage(error);

      toaster.create({
        type: "error",
        title: active ? "자동실행을 켤 수 없습니다" : "자동실행 상태 변경 실패",
        description: active
          ? `${errorMessage} 필수 설정을 확인한 뒤 다시 시도해주세요.`
          : errorMessage,
      });
      return false;
    }
  };

  const handlePrimaryAction = async () => {
    if (!canUsePrimaryAction) {
      return;
    }

    if (primaryActionKind === "run" || primaryActionKind === "stop") {
      await executionAction.handleAction();
      return;
    }

    if (primaryActionKind === "enable-auto-run") {
      await toggleAutoRun(true);
      return;
    }

    if (primaryActionKind === "disable-auto-run-and-stop") {
      const disabled = await toggleAutoRun(false, true);
      if (!disabled) {
        return;
      }

      const stopped = await executionAction.handleAction();
      toaster.create({
        type: stopped ? "success" : "warning",
        title: stopped ? "자동실행 중지 완료" : "자동실행 꺼짐",
        description: stopped
          ? "자동실행을 끄고 현재 실행을 중지했습니다."
          : "자동실행은 꺼졌지만 현재 실행 중지는 실패했습니다.",
      });
      return;
    }

    await toggleAutoRun(false);
  };

  return {
    primaryActionKind,
    primaryActionLabel: getWorkflowListPrimaryActionLabel(primaryActionKind),
    triggerDisplayLabel: getWorkflowListTriggerDisplayLabel(workflow),
    isPrimaryActionPending,
    canUsePrimaryAction,
    handlePrimaryAction,
  };
};
