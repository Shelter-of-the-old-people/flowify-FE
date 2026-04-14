import { useMutation } from "@tanstack/react-query";

import { workflowApi } from "../../api";

import { syncWorkflowCache } from "./workflow-cache-utils";

export const useGenerateWorkflowMutation = () =>
  useMutation({
    mutationFn: workflowApi.generate,
    onSuccess: syncWorkflowCache,
  });
