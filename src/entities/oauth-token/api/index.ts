import { connectOAuthTokenAPI } from "./connect-oauth-token.api";
import { disconnectOAuthTokenAPI } from "./disconnect-oauth-token.api";
import { getOAuthTokensAPI } from "./get-oauth-tokens.api";
import { upsertManualOAuthTokenAPI } from "./upsert-manual-oauth-token.api";

export * from "./types";

export const oauthApi = {
  getTokens: getOAuthTokensAPI,
  connect: connectOAuthTokenAPI,
  disconnect: disconnectOAuthTokenAPI,
  upsertManualToken: upsertManualOAuthTokenAPI,
};
