import { useMutation } from "@tanstack/react-query";

import type { WorkflowResponse } from "../../api";
import { templateApi } from "../../api";
import { syncWorkflowCache } from "../workflow";

export const useInstantiateTemplateMutation = () =>
  useMutation({
    mutationFn: (id: string) => templateApi.instantiate(id),
    onSuccess: async (workflow: WorkflowResponse) => {
      await syncWorkflowCache(workflow);
    },
  });
