import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useCreateWorkflowMutation = () =>
  useMutation({
    mutationFn: workflowApi.create,
    onSuccess: syncWorkflowCache,
  });
