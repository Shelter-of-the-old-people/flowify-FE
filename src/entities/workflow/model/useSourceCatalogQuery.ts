import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useSourceCatalogQuery = (
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<
        Awaited<ReturnType<typeof workflowApi.getSourceCatalog>>
      >,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey: workflowKeys.sourceCatalog(),
    queryFn: workflowApi.getSourceCatalog,
    enabled: options?.enabled ?? true,
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
