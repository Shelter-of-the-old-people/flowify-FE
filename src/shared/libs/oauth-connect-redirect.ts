import { ROUTE_PATHS } from "@/shared/constants";

const OAUTH_CONNECT_RETURN_PATH_KEY = "oauthConnectReturnPath";

const normalizeReturnPath = (path: string | null) => {
  if (!path || !path.startsWith("/")) {
    return ROUTE_PATHS.ACCOUNT;
  }

  return path;
};

export const storeOAuthConnectReturnPath = (path: string) => {
  sessionStorage.setItem(
    OAUTH_CONNECT_RETURN_PATH_KEY,
    normalizeReturnPath(path),
  );
};

export const consumeOAuthConnectReturnPath = () => {
  const storedPath = sessionStorage.getItem(OAUTH_CONNECT_RETURN_PATH_KEY);
  sessionStorage.removeItem(OAUTH_CONNECT_RETURN_PATH_KEY);
  return normalizeReturnPath(storedPath);
};

export const getCurrentRelativeUrl = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;
