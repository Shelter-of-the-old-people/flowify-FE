import { useNavigate } from "react-router";

import { useWorkflowExecutionAction } from "@/features/workflow-execution";
import { buildPath } from "@/shared";

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
  const navigate = useNavigate();
  const { actionKind, actionLabel, isActionPending, handleAction } =
    useWorkflowExecutionAction(issue.workflowId);
  const workflowId =
    typeof issue.workflowId === "string" ? issue.workflowId.trim() : "";
  const canOpenWorkflow = workflowId.length > 0;

  const handleOpenWorkflow = () => {
    if (!canOpenWorkflow) {
      return;
    }

    navigate(buildPath.workflowEditor(workflowId));
  };

  return (
    <DashboardErrorCard
      issue={issue}
      executionActionKind={actionKind}
      executionActionLabel={actionLabel}
      isExecutionActionPending={isActionPending}
      isExpanded={isExpanded}
      canOpenWorkflow={canOpenWorkflow}
      onOpenWorkflow={handleOpenWorkflow}
      onToggle={onToggle}
      onExecutionAction={() => void handleAction()}
    />
  );
};
