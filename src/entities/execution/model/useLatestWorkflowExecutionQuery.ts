import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { executionApi } from "../api";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";
import { executionKeys } from "./query-keys";

export const useLatestWorkflowExecutionQuery = (
  workflowId: string | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof executionApi.getLatest>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey: workflowId
      ? executionKeys.latest(workflowId)
      : ["execution", "workflow", "unknown", "latest"],
    queryFn: () => {
      if (!workflowId) {
        throw new Error("workflow id is required");
      }

      return executionApi.getLatest(workflowId);
    },
    enabled: Boolean(workflowId) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchInterval:
      options?.refetchInterval ??
      ((query) => {
        const execution = query.state.data;
        if (!execution) {
          return false;
        }

        return isExecutionInFlight(execution.state)
          ? executionPollInterval
          : false;
      }),
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
