import { useMutation } from "@tanstack/react-query";

import { queryClient } from "@/shared";
import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";

import {
  type OAuthTokenSummary,
  type UpsertManualOAuthTokenVariables,
  oauthApi,
} from "../api";

import { oauthKeys } from "./query-keys";

export const useUpsertManualTokenMutation = (
  options?: MutationPolicyOptions<
    OAuthTokenSummary,
    UpsertManualOAuthTokenVariables
  >,
) =>
  useMutation({
    mutationFn: (variables: UpsertManualOAuthTokenVariables) =>
      oauthApi.upsertManualToken(variables),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: oauthKeys.tokens(),
      });
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
