import { useQuery } from "@tanstack/react-query";

import { type QueryPolicyOptions, toQueryMeta } from "@/shared/api";

import { workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useWorkflowSchemaPreviewQuery = (
  workflowId: string | undefined,
  options?: QueryPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.getSchemaPreview>>
  >,
) =>
  useQuery({
    queryKey: workflowId
      ? workflowKeys.schemaPreview(workflowId)
      : ["workflow", "schema-preview", "idle"],
    queryFn: () => {
      if (!workflowId) {
        throw new Error("workflow id is required");
      }

      return workflowApi.getSchemaPreview(workflowId);
    },
    enabled: Boolean(workflowId) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
