import { useQuery } from "@tanstack/react-query";

import { executionApi } from "../../api";
import { executionKeys } from "../../constants";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";

export const useWorkflowExecutionQuery = (
  workflowId: string | undefined,
  executionId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey:
      workflowId && executionId
        ? executionKeys.detail(workflowId, executionId)
        : ["execution", "detail", "unknown"],
    queryFn: () => {
      if (!workflowId || !executionId) {
        throw new Error("workflow id and execution id are required");
      }

      return executionApi.getById(workflowId, executionId);
    },
    enabled: Boolean(workflowId && executionId) && enabled,
    refetchInterval: (query) => {
      const execution = query.state.data;
      if (!execution) {
        return false;
      }

      return isExecutionInFlight(execution.state)
        ? executionPollInterval
        : false;
    },
    throwOnError: false,
  });
