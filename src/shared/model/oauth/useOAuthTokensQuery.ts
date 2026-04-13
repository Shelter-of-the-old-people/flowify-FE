import { useQuery } from "@tanstack/react-query";

import { oauthApi } from "../../api";
import { oauthKeys } from "../../constants";
import { type QueryPolicyOptions, toQueryMeta } from "../query-policy";

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
