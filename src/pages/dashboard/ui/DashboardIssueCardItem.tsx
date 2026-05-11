import { useWorkflowExecutionAction } from "@/features/workflow-execution";

import { type DashboardIssue } from "../model";

import { DashboardErrorCard } from "./DashboardErrorCard";

type Props = {
  issue: DashboardIssue;
  isExpanded: boolean;
  onToggle: () => void;
};

export const DashboardIssueCardItem = ({
  issue,
  isExpanded,
  onToggle,
}: Props) => {
  const { actionKind, actionLabel, isActionPending, handleAction } =
    useWorkflowExecutionAction(issue.workflowId);

  return (
    <DashboardErrorCard
      issue={issue}
      executionActionKind={actionKind}
      executionActionLabel={actionLabel}
      isExecutionActionPending={isActionPending}
      isExpanded={isExpanded}
      onToggle={onToggle}
      onExecutionAction={() => void handleAction()}
    />
  );
};
