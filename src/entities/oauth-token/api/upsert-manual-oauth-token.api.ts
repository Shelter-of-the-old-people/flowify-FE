import { request } from "@/shared/api/core";

import {
  type OAuthTokenSummary,
  type UpsertManualOAuthTokenVariables,
} from "./types";

export const upsertManualOAuthTokenAPI = ({
  service,
  accessToken,
}: UpsertManualOAuthTokenVariables): Promise<OAuthTokenSummary> =>
  request<OAuthTokenSummary>({
    url: `/oauth-tokens/${service}/manual`,
    method: "PUT",
    data: {
      accessToken,
    },
  });
