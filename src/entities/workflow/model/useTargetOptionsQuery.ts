import { useInfiniteQuery } from "@tanstack/react-query";

import {
  type InfiniteQueryPolicyOptions,
  resolveInfiniteQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { type TargetOptionsRequest, workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useTargetOptionsQuery = (
  requestParams: TargetOptionsRequest | null,
  enabledOrOptions?:
    | boolean
    | InfiniteQueryPolicyOptions<
        Awaited<ReturnType<typeof workflowApi.getTargetOptions>>
      >,
) => {
  const options = resolveInfiniteQueryPolicyOptions(enabledOrOptions);
  const serviceKey = requestParams?.serviceKey ?? null;
  const mode = requestParams?.mode ?? null;
  const parentId = requestParams?.parentId ?? "";
  const query = requestParams?.query ?? "";

  return useInfiniteQuery({
    queryKey:
      serviceKey && mode
        ? workflowKeys.targetOptions(serviceKey, mode, parentId, query, "")
        : ["workflow", "editor-catalog", "sources", "target-options", "idle"],
    queryFn: ({ pageParam }) => {
      if (!requestParams || !serviceKey || !mode) {
        throw new Error("service key and mode are required");
      }

      return workflowApi.getTargetOptions({
        ...requestParams,
        cursor: typeof pageParam === "string" ? pageParam : null,
      });
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(serviceKey && mode) && (options?.enabled ?? true),
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
