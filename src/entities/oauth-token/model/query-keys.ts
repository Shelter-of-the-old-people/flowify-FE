export const oauthKeys = {
  all: () => ["oauth"] as const,
  tokens: () => [...oauthKeys.all(), "tokens"] as const,
} as const;
