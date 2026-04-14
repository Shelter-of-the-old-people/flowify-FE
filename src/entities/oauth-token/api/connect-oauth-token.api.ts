import { request } from "@/shared/api/core";

import type { OAuthConnectResponse } from "./types";

export const connectOAuthTokenAPI = (
  service: string,
): Promise<OAuthConnectResponse> =>
  request<OAuthConnectResponse>({
    url: `/oauth-tokens/${service}/connect`,
    method: "POST",
  });
