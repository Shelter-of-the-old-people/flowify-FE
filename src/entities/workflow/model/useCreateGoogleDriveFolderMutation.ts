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
    mutationFn: (body: CreateGoogleDriveFolderRequest) =>
      workflowApi.createGoogleDriveFolder(body),
    retry: options?.retry,
    meta: toMutationMeta(options),
    onSuccess: async (folder, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.sourceTargetOptionsRoot("google_drive"),
      });
      await options?.onSuccess?.(folder, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      await options?.onError?.(error, variables, onMutateResult, context);
    },
  });
