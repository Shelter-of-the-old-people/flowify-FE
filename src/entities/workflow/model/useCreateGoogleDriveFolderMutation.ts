import { useMutation } from "@tanstack/react-query";

import { type MutationPolicyOptions, toMutationMeta } from "@/shared/api";
import { queryClient } from "@/shared/libs";

import { type CreateGoogleDriveFolderRequest, workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useCreateGoogleDriveFolderMutation = (
  options?: MutationPolicyOptions<
    Awaited<ReturnType<typeof workflowApi.createGoogleDriveFolder>>,
    CreateGoogleDriveFolderRequest
  >,
) =>
  useMutation({
    mutationFn: workflowApi.createGoogleDriveFolder,
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (createdFolder, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.targetOptionsRoot("google_drive"),
      });
      await options?.onSuccess?.(
        createdFolder,
        variables,
        onMutateResult,
        context,
      );
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
