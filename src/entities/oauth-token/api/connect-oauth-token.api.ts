import { request } from "@/shared/api/core";

import { type OAuthConnectResult, type RawOAuthConnectResponse } from "./types";

const normalizeOAuthConnectResponse = (
  response: RawOAuthConnectResponse,
): OAuthConnectResult => {
  if ("authUrl" in response) {
    return {
      kind: "redirect",
      authUrl: response.authUrl,
    };
  }

  return {
    kind: "direct",
    service: response.service,
    connected: true,
  };
};

export const connectOAuthTokenAPI = (
  service: string,
): Promise<OAuthConnectResult> =>
  request<RawOAuthConnectResponse>({
    url: `/oauth-tokens/${service}/connect`,
    method: "POST",
  }).then(normalizeOAuthConnectResponse);
