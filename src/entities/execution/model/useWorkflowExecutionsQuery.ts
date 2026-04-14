import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { executionApi } from "../api";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";
import { executionKeys } from "./query-keys";

export const useWorkflowExecutionsQuery = (
  workflowId: string | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof executionApi.getList>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey: workflowId
      ? executionKeys.lists(workflowId)
      : ["execution", "unknown"],
    queryFn: () => {
      if (!workflowId) {
        throw new Error("workflow id is required");
      }

      return executionApi.getList(workflowId);
    },
    enabled: Boolean(workflowId) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval:
      options?.refetchInterval ??
      ((query) => {
        const executions = query.state.data;
        if (!executions?.length) {
          return false;
        }

        return executions.some((execution) =>
          isExecutionInFlight(execution.state),
        )
          ? executionPollInterval
          : false;
      }),
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};

