import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";
import { queryClient } from "@/shared/libs";

import { type CreateGoogleSheetsSpreadsheetRequest, workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useCreateGoogleSheetsSpreadsheetMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.createGoogleSheetsSpreadsheet>>,
    CreateGoogleSheetsSpreadsheetRequest
  >,
) =>
  useMutation({
    mutationFn: (body: CreateGoogleSheetsSpreadsheetRequest) =>
      workflowApi.createGoogleSheetsSpreadsheet(body),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (spreadsheet, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.sourceTargetOptionsRoot("google_sheets"),
      });
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.sinkTargetOptionsRoot("google_sheets"),
      });
      await options?.onSuccess?.(
        spreadsheet,
        variables,
        onMutateResult,
        context,
      );
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
