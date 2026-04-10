const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_STATE_KEY = "googleOAuthState";

const getGoogleClientId = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
  }

  return clientId;
};

export const createGoogleOAuthUrl = () => {
  const state = crypto.randomUUID();
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: `${window.location.origin}/login/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
};

export const getStoredGoogleOAuthState = () =>
  sessionStorage.getItem(OAUTH_STATE_KEY);

export const clearGoogleOAuthState = () => {
  sessionStorage.removeItem(OAUTH_STATE_KEY);
};
