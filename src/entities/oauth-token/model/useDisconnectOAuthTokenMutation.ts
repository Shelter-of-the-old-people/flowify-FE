import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";
import { queryClient } from "@/shared";

import { oauthApi } from "../api";
import { oauthKeys } from "./query-keys";

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

