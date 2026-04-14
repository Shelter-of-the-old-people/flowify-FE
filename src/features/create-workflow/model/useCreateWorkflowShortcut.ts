import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import { ROUTE_PATHS, buildPath, useCreateWorkflowMutation } from "@/shared";

export const useCreateWorkflowShortcut = () => {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);
  const { mutateAsync: createWorkflowMutation } = useCreateWorkflowMutation();

  const createWorkflow = useCallback(async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const workflow = await createWorkflowMutation({
        name: "새 워크플로우",
        description: "",
        nodes: [],
        edges: [],
        trigger: null,
      });

      navigate(buildPath.workflowEditor(workflow.id));
    } catch {
      navigate(ROUTE_PATHS.WORKFLOWS);
    } finally {
      setIsPending(false);
    }
  }, [createWorkflowMutation, isPending, navigate]);

  return {
    createWorkflow,
    isPending,
  };
};
