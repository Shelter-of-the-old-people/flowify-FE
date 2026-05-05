import { useState } from "react";

export const useDashboardActions = () => {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  const handleToggleIssue = (issueId: string) => {
    setExpandedIssueId((currentIssueId) =>
      currentIssueId === issueId ? null : issueId,
    );
  };

  return {
    expandedIssueId,
    handleToggleIssue,
  };
};
