import { useQuery } from "@tanstack/react-query";

import { executionApi } from "../../api";
import { executionKeys } from "../../constants";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";

export const useWorkflowExecutionsQuery = (
  workflowId: string | undefined,
  enabled = true,
) =>
  useQuery({
    queryKey: workflowId
      ? executionKeys.lists(workflowId)
      : ["execution", "unknown"],
    queryFn: () => {
      if (!workflowId) {
        throw new Error("workflow id is required");
      }

      return executionApi.getList(workflowId);
    },
    enabled: Boolean(workflowId) && enabled,
    refetchInterval: (query) => {
      const executions = query.state.data;
      if (!executions?.length) {
        return false;
      }

      return executions.some((execution) =>
        isExecutionInFlight(execution.state),
      )
        ? executionPollInterval
        : false;
    },
    throwOnError: false,
  });
