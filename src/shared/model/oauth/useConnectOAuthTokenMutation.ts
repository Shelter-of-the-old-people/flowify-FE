import { useMutation } from "@tanstack/react-query";

import { oauthApi } from "../../api";

export const useConnectOAuthTokenMutation = () =>
  useMutation({
    mutationFn: (service: string) => oauthApi.connect(service),
  });
