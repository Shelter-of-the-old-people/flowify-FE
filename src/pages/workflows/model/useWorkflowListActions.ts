import { useNavigate } from "react-router";

import { useCreateWorkflowShortcut } from "@/features/create-workflow";
import { buildPath } from "@/shared";

export const useWorkflowListActions = () => {
  const navigate = useNavigate();
  const { createWorkflow, isPending: isCreatePending } =
    useCreateWorkflowShortcut();

  const handleCreateWorkflow = () => {
    void createWorkflow();
  };

  const handleOpenWorkflow = (workflowId: string) => {
    navigate(buildPath.workflowEditor(workflowId));
  };

  return {
    isCreatePending,
    handleCreateWorkflow,
    handleOpenWorkflow,
  };
};
