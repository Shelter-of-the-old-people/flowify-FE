import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { type ExecutionDetail, executionApi } from "../api";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";
import { executionKeys } from "./query-keys";
import { useLatestWorkflowExecutionQuery } from "./useLatestWorkflowExecutionQuery";

export const useLatestExecutionDetailQuery = (
  workflowId: string | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof executionApi.getById>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);
  const isEnabled = options?.enabled ?? true;
  const latestExecutionQuery = useLatestWorkflowExecutionQuery(workflowId, {
    enabled: isEnabled,
    errorMessage: options?.errorMessage,
    refetchOnMount: options?.refetchOnMount,
    retry: options?.retry,
    showErrorToast: options?.showErrorToast,
    staleTime: options?.staleTime,
  });
  const latestExecution = latestExecutionQuery.data ?? null;
  const executionId = latestExecution?.id;

  return useQuery({
    queryKey:
      workflowId && executionId
        ? executionKeys.detail(workflowId, executionId)
        : ["execution", "workflow", "unknown", "detail", "latest"],
    queryFn: () => {
      if (!workflowId || !executionId) {
        throw new Error("workflow id and execution id are required");
      }

      return executionApi.getById(workflowId, executionId);
    },
    enabled: Boolean(workflowId && executionId) && isEnabled,
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchInterval:
      options?.refetchInterval ??
      ((query) => {
        const execution = query.state.data as ExecutionDetail | undefined;

        return execution && isExecutionInFlight(execution.state)
          ? executionPollInterval
          : false;
      }),
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
