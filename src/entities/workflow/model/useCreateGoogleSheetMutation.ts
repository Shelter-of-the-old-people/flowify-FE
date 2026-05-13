import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";
import { queryClient } from "@/shared/libs";

import { type CreateGoogleSheetRequest, workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useCreateGoogleSheetMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.createGoogleSheet>>,
    CreateGoogleSheetRequest
  >,
) =>
  useMutation({
    mutationFn: (body: CreateGoogleSheetRequest) =>
      workflowApi.createGoogleSheet(body),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (sheet, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.sourceTargetOptionsRoot("google_sheets"),
      });
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.sinkTargetOptionsRoot("google_sheets"),
      });
      await options?.onSuccess?.(sheet, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
