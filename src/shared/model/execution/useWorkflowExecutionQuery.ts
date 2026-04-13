import { useQuery } from "@tanstack/react-query";

import { executionApi } from "../../api";
import { executionKeys } from "../../constants";
import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "../query-policy";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";

export const useWorkflowExecutionQuery = (
  workflowId: string | undefined,
  executionId: string | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof executionApi.getById>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
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
    enabled: Boolean(workflowId && executionId) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
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
