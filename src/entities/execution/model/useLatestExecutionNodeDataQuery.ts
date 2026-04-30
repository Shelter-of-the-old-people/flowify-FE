import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { executionApi } from "../api";

import { executionPollInterval, isExecutionInFlight } from "./execution-utils";
import { executionKeys } from "./query-keys";

export const useLatestExecutionNodeDataQuery = (
  workflowId: string | undefined,
  nodeId: string | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<
        Awaited<ReturnType<typeof executionApi.getLatestNodeData>>
      >,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey:
      workflowId && nodeId
        ? executionKeys.latestNodeData(workflowId, nodeId)
        : ["execution", "latest", "node-data", "unknown"],
    queryFn: () => {
      if (!workflowId || !nodeId) {
        throw new Error("workflow id and node id are required");
      }

      return executionApi.getLatestNodeData(workflowId, nodeId);
    },
    enabled: Boolean(workflowId && nodeId) && (options?.enabled ?? true),
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
