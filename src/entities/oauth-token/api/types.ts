export interface OAuthTokenSummary {
  service: string;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
}

export type OAuthConnectResponse =
  | {
      authUrl: string;
    }
  | {
      connected: string;
      service: string;
    };
