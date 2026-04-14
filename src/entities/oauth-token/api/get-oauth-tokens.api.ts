import { request } from "@/shared/api/core";

import type { OAuthTokenSummary } from "./types";

export const getOAuthTokensAPI = (): Promise<OAuthTokenSummary[]> =>
  request<OAuthTokenSummary[]>({
    url: "/oauth-tokens",
    method: "GET",
  });
