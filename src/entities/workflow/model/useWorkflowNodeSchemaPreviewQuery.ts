import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useWorkflowNodeSchemaPreviewQuery = (
  workflowId: string | undefined,
  nodeId: string | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<
        Awaited<ReturnType<typeof workflowApi.getNodeSchemaPreview>>
      >,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey:
      workflowId && nodeId
        ? workflowKeys.nodeSchemaPreview(workflowId, nodeId)
        : ["workflow", "node-schema-preview", "unknown"],
    queryFn: () => {
      if (!workflowId || !nodeId) {
        throw new Error("workflow id and node id are required");
      }

      return workflowApi.getNodeSchemaPreview(workflowId, nodeId);
    },
    enabled: Boolean(workflowId && nodeId) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
