import { useQuery } from "@tanstack/react-query";

import { type QueryPolicyOptions, toQueryMeta } from "@/shared/api";

import { templateApi } from "../api";

import { templateKeys } from "./query-keys";

export const useTemplateListQuery = (
  category?: string,
  options?: QueryPolicyOptions<Awaited<ReturnType<typeof templateApi.getList>>>,
) =>
  useQuery({
    queryKey: templateKeys.list(category),
    queryFn: () => templateApi.getList(category),
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
