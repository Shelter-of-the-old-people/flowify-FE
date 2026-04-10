import { useMutation, useQuery } from "@tanstack/react-query";

import { oauthApi } from "../api";
import { QUERY_KEYS } from "../constants";
import { queryClient } from "../libs";

export const useOAuthTokensQuery = () =>
  useQuery({
    queryKey: QUERY_KEYS.oauthTokens,
    queryFn: async () => {
      const response = await oauthApi.getTokens();
      return response.data.data;
    },
    throwOnError: false,
  });

export const useConnectOAuthTokenMutation = () =>
  useMutation({
    mutationFn: async (service: string) => {
      const response = await oauthApi.connect(service);
      return response.data.data;
    },
  });

export const useDisconnectOAuthTokenMutation = () =>
  useMutation({
    mutationFn: async (service: string) => {
      const response = await oauthApi.disconnect(service);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.oauthTokens,
      });
    },
  });
