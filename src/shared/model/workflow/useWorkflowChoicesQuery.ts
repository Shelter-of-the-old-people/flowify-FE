import { useQuery } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";

export const useWorkflowChoicesQuery = (
  workflowId: string | undefined,
  prevNodeId: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey:
      workflowId && prevNodeId
        ? workflowKeys.choices(workflowId, prevNodeId)
        : ["workflow", "choices", "idle"],
    queryFn: () => {
      if (!workflowId || !prevNodeId) {
        throw new Error("workflow id and prev node id are required");
      }

      return workflowApi.getChoices(workflowId, prevNodeId);
    },
    enabled: Boolean(workflowId && prevNodeId) && enabled,
    throwOnError: false,
  });
