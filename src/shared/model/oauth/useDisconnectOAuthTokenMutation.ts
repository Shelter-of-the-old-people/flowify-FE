import { useMutation } from "@tanstack/react-query";

import { oauthApi } from "../../api";
import { oauthKeys } from "../../constants";
import { queryClient } from "../../libs";

export const useDisconnectOAuthTokenMutation = () =>
  useMutation({
    mutationFn: (service: string) => oauthApi.disconnect(service),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: oauthKeys.tokens(),
      });
    },
  });
