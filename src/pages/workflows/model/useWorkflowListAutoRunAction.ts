import { useMemo } from "react";

import {
  type WorkflowResponse,
  useToggleWorkflowActiveMutation,
} from "@/entities/workflow";
import { getAuthUser } from "@/shared";
import { getApiErrorMessage, toaster } from "@/shared/utils";

import { getWorkflowAutoRunState } from "./workflow-list";

export const useWorkflowListAutoRunAction = (workflow: WorkflowResponse) => {
  const viewerUserId = getAuthUser()?.id ?? null;
  const autoRunState = useMemo(
    () => getWorkflowAutoRunState(workflow, viewerUserId),
    [viewerUserId, workflow],
  );
  const { mutateAsync: toggleWorkflowActive, isPending } =
    useToggleWorkflowActiveMutation({
      showErrorToast: false,
    });

  const handleToggle = async () => {
    if (
      !autoRunState.canToggle ||
      autoRunState.nextActive === null ||
      isPending
    ) {
      return;
    }

    try {
      await toggleWorkflowActive({
        workflowId: workflow.id,
        active: autoRunState.nextActive,
      });

      toaster.create({
        type: "success",
        title: autoRunState.nextActive ? "자동 실행 켜짐" : "자동 실행 꺼짐",
        description: autoRunState.nextActive
          ? "다음 주기부터 자동 실행을 다시 시작합니다."
          : "다음 주기부터 자동 실행을 멈춥니다.",
      });
    } catch (error) {
      toaster.create({
        type: "error",
        title: "자동 실행 상태 변경 실패",
        description: getApiErrorMessage(error),
      });
    }
  };

  return {
    autoRunKind: autoRunState.kind,
    autoRunLabel: autoRunState.label,
    isAutoRunToggleable: autoRunState.canToggle,
    isAutoRunPending: isPending,
    handleToggleAutoRun: handleToggle,
  };
};
