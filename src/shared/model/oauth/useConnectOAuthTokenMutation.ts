import { useMutation } from "@tanstack/react-query";

import { oauthApi } from "../../api";
import { type MutationPolicyOptions, toMutationMeta } from "../query-policy";

export const useConnectOAuthTokenMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof oauthApi.connect>>,
    string
  >,
) =>
  useMutation({
    mutationFn: (service: string) => oauthApi.connect(service),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (data, service, onMutateResult, context) => {
      await options?.onSuccess?.(data, service, onMutateResult, context);
    },
    onError: async (error, service, onMutateResult, context) => {
      await options?.onError?.(error, service, onMutateResult, context);
    },
  });
