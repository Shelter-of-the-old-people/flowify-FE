import { useState } from "react";

import { useToggleWorkflowActiveMutation } from "@/entities/workflow";

export const useDashboardActions = () => {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [togglingWorkflowId, setTogglingWorkflowId] = useState<string | null>(
    null,
  );
  const [issueActiveOverrides, setIssueActiveOverrides] = useState<
    Record<string, boolean>
  >({});
  const { mutateAsync: toggleWorkflowActive } =
    useToggleWorkflowActiveMutation();

  const handleToggleIssue = (issueId: string) => {
    setExpandedIssueId((currentIssueId) =>
      currentIssueId === issueId ? null : issueId,
    );
  };

  const handleToggleWorkflow = async (
    issueId: string,
    currentIsActive: boolean,
  ) => {
    const nextActive = !currentIsActive;

    setIssueActiveOverrides((currentOverrides) => ({
      ...currentOverrides,
      [issueId]: nextActive,
    }));

    const variables = {
      workflowId: issueId,
      active: nextActive,
    };

    setTogglingWorkflowId(issueId);

    try {
      await toggleWorkflowActive(variables);
    } catch (error) {
      setIssueActiveOverrides((currentOverrides) => ({
        ...currentOverrides,
        [issueId]: currentIsActive,
      }));
      throw error;
    } finally {
      setTogglingWorkflowId(null);
    }
  };

  const getIssueIsActive = (issueId: string, issueIsActive: boolean) =>
    issueActiveOverrides[issueId] ?? issueIsActive;

  return {
    expandedIssueId,
    getIssueIsActive,
    togglingWorkflowId,
    handleToggleIssue,
    handleToggleWorkflow,
  };
};
