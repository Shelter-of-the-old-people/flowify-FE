import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import {
  QUERY_KEYS,
  ROUTE_PATHS,
  buildPath,
  queryClient,
  workflowApi,
} from "@/shared";

export const useCreateWorkflowShortcut = () => {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  const createWorkflow = useCallback(async () => {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const response = await workflowApi.create({
        name: "새 워크플로우",
        description: "",
        nodes: [],
        edges: [],
        trigger: null,
      });

      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflows });
      navigate(buildPath.workflowEditor(response.data.data.id));
    } catch {
      navigate(ROUTE_PATHS.WORKFLOWS);
    } finally {
      setIsPending(false);
    }
  }, [isPending, navigate]);

  return {
    createWorkflow,
    isPending,
  };
};
