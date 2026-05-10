import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import {
  createManualTrigger,
  useCreateWorkflowMutation,
} from "@/entities/workflow";
import { ROUTE_PATHS, buildPath } from "@/shared";
import { toaster } from "@/shared/utils/toaster/toaster";

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
        trigger: createManualTrigger(),
      });

      navigate(buildPath.workflowEditor(workflow.id));
    } catch {
      toaster.create({
        title: "워크플로우 생성에 실패했습니다.",
        description: "잠시 후 다시 시도해주세요.",
        type: "error",
      });
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
