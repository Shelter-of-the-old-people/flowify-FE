import { useInfiniteQuery } from "@tanstack/react-query";

import {
  type InfiniteQueryPolicyOptions,
  resolveInfiniteQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import {
  type SinkTargetOptionsParameters,
  type SinkTargetOptionsResponse,
  workflowApi,
} from "../api";

import { workflowKeys } from "./query-keys";

type SinkTargetOptionsCursor = string | undefined;

export const useInfiniteSinkTargetOptionsQuery = (
  serviceKey: string | undefined,
  params: Omit<SinkTargetOptionsParameters, "cursor"> | undefined,
  enabledOrOptions?:
    | boolean
    | InfiniteQueryPolicyOptions<
        SinkTargetOptionsResponse,
        SinkTargetOptionsCursor
      >,
) => {
  const options = resolveInfiniteQueryPolicyOptions<
    SinkTargetOptionsResponse,
    SinkTargetOptionsCursor
  >(enabledOrOptions);

  return useInfiniteQuery({
    queryKey:
      serviceKey && params?.type
        ? workflowKeys.sinkTargetOptions(serviceKey, params)
        : [
            "workflow",
            "editor-catalog",
            "sinks",
            "target-options",
            "infinite",
            "idle",
          ],
    queryFn: ({ pageParam }) => {
      if (!serviceKey || !params?.type) {
        throw new Error("service key and sink target option type are required");
      }

      return workflowApi.getSinkTargetOptions(serviceKey, {
        ...params,
        cursor: pageParam,
      });
    },
    enabled: Boolean(serviceKey && params?.type) && (options?.enabled ?? true),
    initialPageParam: undefined as SinkTargetOptionsCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
