import { type WorkflowResponse } from "@/entities/workflow";
import { useWorkflowExecutionAction } from "@/features/workflow-execution";

import { WorkflowRow } from "./WorkflowRow";

type Props = {
  workflow: WorkflowResponse;
  onOpen: () => void;
};

export const WorkflowRowItem = ({ workflow, onOpen }: Props) => {
  const { actionKind, actionLabel, isActionPending, handleAction } =
    useWorkflowExecutionAction(workflow.id);

  return (
    <WorkflowRow
      workflow={workflow}
      executionActionKind={actionKind}
      executionActionLabel={actionLabel}
      isExecutionActionPending={isActionPending}
      onOpen={onOpen}
      onExecutionAction={() => void handleAction()}
    />
  );
};
