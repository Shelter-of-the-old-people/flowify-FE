import { useMutation, useQuery } from "@tanstack/react-query";

import type { WorkflowSummary } from "@/entities/workflow";
import { getWorkflowStatus } from "@/entities/workflow";

import type { WorkflowResponse } from "../api";
import { workflowApi } from "../api";
import { QUERY_KEYS } from "../constants";
import { queryClient } from "../libs";
import { toWorkflowUpdateRequest } from "../libs/workflow-adapter";
import type { WorkflowAdapterStoreState } from "../libs/workflow-adapter";

export const useWorkflowListQuery = (page = 0, size = 20) =>
  useQuery({
    queryKey: [...QUERY_KEYS.workflows, { page, size }] as const,
    queryFn: async () => {
      const response = await workflowApi.getList(page, size);
      return response.data.data;
    },
    throwOnError: false,
  });

export const useWorkflowQuery = (id: string | undefined) =>
  useQuery({
    queryKey: id ? QUERY_KEYS.workflow(id) : ["workflows", "unknown"],
    queryFn: async () => {
      if (!id) {
        throw new Error("workflow id is required");
      }

      const response = await workflowApi.getById(id);
      return response.data.data;
    },
    enabled: Boolean(id),
    throwOnError: false,
  });

export const useSaveWorkflowMutation = () =>
  useMutation({
    mutationFn: async ({
      workflowId,
      store,
    }: {
      workflowId: string;
      store: WorkflowAdapterStoreState;
    }) => {
      const response = await workflowApi.update(
        workflowId,
        toWorkflowUpdateRequest(store),
      );

      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workflows,
      });
    },
  });

export const toWorkflowSummary = (
  workflow: WorkflowResponse,
): WorkflowSummary => ({
  id: workflow.id,
  name: workflow.name,
  description: workflow.description,
  isActive: workflow.isActive,
  status: getWorkflowStatus(workflow.isActive),
  createdAt: workflow.createdAt,
  updatedAt: workflow.updatedAt,
});
