import { useQuery } from "@tanstack/react-query";

import { type QueryPolicyOptions, toQueryMeta } from "@/shared/api";

import { oauthApi } from "../api";
import { oauthKeys } from "./query-keys";

export const useOAuthTokensQuery = (
  options?: QueryPolicyOptions<Awaited<ReturnType<typeof oauthApi.getTokens>>>,
) =>
  useQuery({
    queryKey: oauthKeys.tokens(),
    queryFn: () => oauthApi.getTokens(),
    enabled: options?.enabled ?? true,
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });

