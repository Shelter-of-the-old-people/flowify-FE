import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useSinkCatalogQuery = (
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<
        Awaited<ReturnType<typeof workflowApi.getSinkCatalog>>
      >,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey: workflowKeys.sinkCatalog(),
    queryFn: workflowApi.getSinkCatalog,
    enabled: options?.enabled ?? true,
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
