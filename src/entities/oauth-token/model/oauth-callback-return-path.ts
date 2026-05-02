const OAUTH_CALLBACK_RETURN_PATH_KEY = "oauth_callback_return_path";

export const storeOAuthCallbackReturnPath = (path: string) => {
  window.sessionStorage.setItem(OAUTH_CALLBACK_RETURN_PATH_KEY, path);
};

export const consumeOAuthCallbackReturnPath = () => {
  const returnPath = window.sessionStorage.getItem(
    OAUTH_CALLBACK_RETURN_PATH_KEY,
  );

  if (returnPath) {
    window.sessionStorage.removeItem(OAUTH_CALLBACK_RETURN_PATH_KEY);
  }

  return returnPath;
};
