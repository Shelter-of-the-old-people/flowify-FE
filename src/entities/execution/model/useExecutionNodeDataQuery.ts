import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { executionApi } from "../api";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";
import { executionKeys } from "./query-keys";

export const useExecutionNodeDataQuery = (
  workflowId: string | undefined,
  executionId: string | undefined,
  nodeId: string | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof executionApi.getNodeData>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey:
      workflowId && executionId && nodeId
        ? executionKeys.nodeData(workflowId, executionId, nodeId)
        : ["execution", "node-data", "unknown"],
    queryFn: () => {
      if (!workflowId || !executionId || !nodeId) {
        throw new Error("workflow id, execution id and node id are required");
      }

      return executionApi.getNodeData(workflowId, executionId, nodeId);
    },
    enabled:
      Boolean(workflowId && executionId && nodeId) &&
      (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval:
      options?.refetchInterval ??
      ((query) => {
        const nodeData = query.state.data;
        if (!nodeData) {
          return false;
        }

        return nodeData.reason === "EXECUTION_RUNNING" ||
          isExecutionInFlight(nodeData.status)
          ? executionPollInterval
          : false;
      }),
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
