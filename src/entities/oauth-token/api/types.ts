export interface OAuthTokenSummary {
  service: string;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
}

export interface OAuthConnectResponse {
  authUrl: string;
}
