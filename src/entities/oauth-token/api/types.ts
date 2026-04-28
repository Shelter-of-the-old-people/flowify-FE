export interface OAuthTokenSummary {
  service: string;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
}

export type RawOAuthConnectResponse =
  | { authUrl: string }
  | { connected: "true"; service: string };

export type OAuthConnectResult =
  | { kind: "redirect"; authUrl: string }
  | { kind: "direct"; service: string; connected: true };
