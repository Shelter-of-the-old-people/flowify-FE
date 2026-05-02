import { useInfiniteQuery } from "@tanstack/react-query";

import {
  type InfiniteQueryPolicyOptions,
  resolveInfiniteQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import {
  type SourceTargetOptionsParameters,
  type SourceTargetOptionsResponse,
  workflowApi,
} from "../api";

import { workflowKeys } from "./query-keys";

type SourceTargetOptionsCursor = string | undefined;

export const useInfiniteSourceTargetOptionsQuery = (
  serviceKey: string | undefined,
  params: Omit<SourceTargetOptionsParameters, "cursor"> | undefined,
  enabledOrOptions?:
    | boolean
    | InfiniteQueryPolicyOptions<
        SourceTargetOptionsResponse,
        SourceTargetOptionsCursor
      >,
) => {
  const options = resolveInfiniteQueryPolicyOptions<
    SourceTargetOptionsResponse,
    SourceTargetOptionsCursor
  >(enabledOrOptions);

  return useInfiniteQuery({
    queryKey:
      serviceKey && params?.mode
        ? workflowKeys.sourceTargetOptions(serviceKey, params)
        : [
            "workflow",
            "editor-catalog",
            "sources",
            "target-options",
            "infinite",
            "idle",
          ],
    queryFn: ({ pageParam }) => {
      if (!serviceKey || !params?.mode) {
        throw new Error("service key and target option mode are required");
      }

      return workflowApi.getSourceTargetOptions(serviceKey, {
        ...params,
        cursor: pageParam,
      });
    },
    enabled: Boolean(serviceKey && params?.mode) && (options?.enabled ?? true),
    initialPageParam: undefined as SourceTargetOptionsCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
