export type OAuthConnectionMethod = "oauth_redirect" | "manual_token" | "alias";

export type OAuthValidationStatus =
  | "valid"
  | "invalid"
  | "scope_insufficient"
  | "unknown";

export interface OAuthTokenSummary {
  service: string;
  connected: boolean;
  accountEmail: string | null;
  accountLabel?: string | null;
  expiresAt: string | null;
  connectionMethod?: OAuthConnectionMethod | null;
  aliasOf?: string | null;
  disconnectable?: boolean | null;
  reason?: string | null;
  maskedHint?: string | null;
  updatedAt?: string | null;
  validationStatus?: OAuthValidationStatus | null;
}

export interface UpsertManualOAuthTokenVariables {
  service: string;
  accessToken: string;
}

export type RawOAuthConnectResponse =
  | { authUrl: string }
  | { connected: "true"; service: string };

export type OAuthConnectResult =
  | { kind: "redirect"; authUrl: string }
  | { kind: "direct"; service: string; connected: true };
