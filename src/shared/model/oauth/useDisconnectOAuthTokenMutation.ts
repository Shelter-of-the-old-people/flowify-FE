import { useMutation } from "@tanstack/react-query";

import { oauthApi } from "../../api";
import { oauthKeys } from "../../constants";
import { queryClient } from "../../libs";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

export const useDisconnectOAuthTokenMutation = (
  options?: MutationPolicyOptions<void, string>,
) =>
  useMutation({
    mutationFn: (service: string) => oauthApi.disconnect(service),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (_, service, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: oauthKeys.tokens(),
      });
      await options?.onSuccess?.(_, service, onMutateResult, context);
    },
    onError: async (error, service, onMutateResult, context) => {
      await options?.onError?.(error, service, onMutateResult, context);
    },
  });
