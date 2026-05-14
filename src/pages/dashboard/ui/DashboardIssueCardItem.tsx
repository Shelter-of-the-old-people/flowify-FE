import { useNavigate } from "react-router";

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
      isExpanded={isExpanded}
      canOpenWorkflow={canOpenWorkflow}
      onOpenWorkflow={handleOpenWorkflow}
      onToggle={onToggle}
    />
  );
};
