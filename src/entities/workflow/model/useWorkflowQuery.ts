import { useQuery } from "@tanstack/react-query";

import { type QueryPolicyOptions, toQueryMeta } from "@/shared/api";

import { workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useWorkflowQuery = (
  id: string | undefined,
  options?: QueryPolicyOptions<Awaited<ReturnType<typeof workflowApi.getById>>>,
) =>
  useQuery({
    queryKey: id ? workflowKeys.detail(id) : ["workflow", "unknown"],
    queryFn: () => {
      if (!id) {
        throw new Error("workflow id is required");
      }

      return workflowApi.getById(id);
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
