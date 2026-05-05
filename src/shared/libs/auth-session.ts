const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";
const TOKEN_REFRESH_LEEWAY_MS = 1000 * 60;

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  createdAt: string;
}

type JwtPayload = {
  exp?: number;
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    return JSON.parse(globalThis.atob(normalized)) as JwtPayload;
  } catch {
    return null;
  }
};

const isTokenValid = (token: string | null) => {
  if (!token) {
    return false;
  }

  return getTokenExpiresAt(token) > Date.now();
};

const getTokenExpiresAt = (token: string | null) => {
  if (!token) {
    return 0;
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== "number") {
    return 0;
  }

  return payload.exp * 1000;
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const storeTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAuthUser = (): AuthSessionUser | null => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSessionUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
};

export const storeAuthUser = (user: AuthSessionUser) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const isAccessTokenValid = () => isTokenValid(getAccessToken());

export const isRefreshTokenValid = () => isTokenValid(getRefreshToken());

export const shouldRefreshAccessToken = () => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!isTokenValid(refreshToken)) {
    return false;
  }

  if (!accessToken) {
    return true;
  }

  return getTokenExpiresAt(accessToken) - Date.now() <= TOKEN_REFRESH_LEEWAY_MS;
};

export const isAuthenticated = () => {
  const hasValidAccessToken = isAccessTokenValid();
  const hasValidRefreshToken = isRefreshTokenValid();

  if (!hasValidAccessToken && !hasValidRefreshToken) {
    clearAuthSession();
    return false;
  }

  return true;
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};
