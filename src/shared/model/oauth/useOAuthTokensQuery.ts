import { useQuery } from "@tanstack/react-query";

import { oauthApi } from "../../api";
import { oauthKeys } from "../../constants";

export const useOAuthTokensQuery = () =>
  useQuery({
    queryKey: oauthKeys.tokens(),
    queryFn: () => oauthApi.getTokens(),
    throwOnError: false,
  });
