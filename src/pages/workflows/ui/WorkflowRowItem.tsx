import { type WorkflowResponse } from "@/entities/workflow";
import { useWorkflowExecutionAction } from "@/features/workflow-execution";

import { useWorkflowListAutoRunAction } from "../model";

import { WorkflowRow } from "./WorkflowRow";

type Props = {
  workflow: WorkflowResponse;
  onOpen: () => void;
};

export const WorkflowRowItem = ({ workflow, onOpen }: Props) => {
  const { actionKind, actionLabel, isActionPending, handleAction } =
    useWorkflowExecutionAction(workflow.id);
  const {
    autoRunKind,
    autoRunLabel,
    isAutoRunToggleable,
    isAutoRunPending,
    handleToggleAutoRun,
  } = useWorkflowListAutoRunAction(workflow);

  return (
    <WorkflowRow
      workflow={workflow}
      autoRunKind={autoRunKind}
      autoRunLabel={autoRunLabel}
      isAutoRunToggleable={isAutoRunToggleable}
      isAutoRunPending={isAutoRunPending}
      executionActionKind={actionKind}
      executionActionLabel={actionLabel}
      isExecutionActionPending={isActionPending}
      onOpen={onOpen}
      onAutoRunToggle={() => void handleToggleAutoRun()}
      onExecutionAction={() => void handleAction()}
    />
  );
};
