import {
  type WorkflowResponse,
  useDeleteWorkflowMutation,
} from "@/entities/workflow";
import { getAuthUser } from "@/shared";
import { getApiErrorMessage, toaster } from "@/shared/utils";

import { useWorkflowListPrimaryAction } from "../model";

import { WorkflowRow } from "./WorkflowRow";

type Props = {
  workflow: WorkflowResponse;
  onOpen: () => void;
};

export const WorkflowRowItem = ({ workflow, onOpen }: Props) => {
  const viewerUserId = getAuthUser()?.id ?? null;
  const canDeleteWorkflow = Boolean(
    viewerUserId && workflow.userId === viewerUserId,
  );
  const {
    primaryActionKind,
    primaryActionLabel,
    triggerDisplayLabel,
    isPrimaryActionPending,
    canUsePrimaryAction,
    handlePrimaryAction,
  } = useWorkflowListPrimaryAction(workflow);
  const { mutateAsync: deleteWorkflow, isPending: isDeletePending } =
    useDeleteWorkflowMutation({
      showErrorToast: false,
    });

  const handleDeleteWorkflow = async () => {
    if (!canDeleteWorkflow || isDeletePending) {
      return;
    }

    try {
      await deleteWorkflow(workflow.id);
      toaster.create({
        type: "success",
        title: "워크플로우 삭제 완료",
        description: "워크플로우가 목록에서 제거되었습니다.",
      });
    } catch (error) {
      toaster.create({
        type: "error",
        title: "워크플로우 삭제 실패",
        description: getApiErrorMessage(error),
      });
    }
  };

  return (
    <WorkflowRow
      workflow={workflow}
      triggerDisplayLabel={triggerDisplayLabel}
      primaryActionKind={primaryActionKind}
      primaryActionLabel={primaryActionLabel}
      isPrimaryActionPending={isPrimaryActionPending}
      canUsePrimaryAction={canUsePrimaryAction}
      canDelete={canDeleteWorkflow}
      isDeletePending={isDeletePending}
      onOpen={onOpen}
      onPrimaryAction={() => void handlePrimaryAction()}
      onDelete={() => void handleDeleteWorkflow()}
    />
  );
};
