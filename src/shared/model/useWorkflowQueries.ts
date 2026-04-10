import { useMutation, useQuery } from "@tanstack/react-query";

import type { WorkflowSummary } from "@/entities/workflow";
import { getWorkflowStatus } from "@/entities/workflow";

import type {
  ChoiceResponse,
  NodeAddRequest,
  NodeSelectionResult,
  WorkflowResponse,
} from "../api";
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

const syncWorkflowCache = async (workflow: WorkflowResponse) => {
  queryClient.setQueryData(QUERY_KEYS.workflow(workflow.id), workflow);
  await queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.workflows,
  });
};

export const useAddWorkflowNodeMutation = () =>
  useMutation({
    mutationFn: async ({
      workflowId,
      body,
    }: {
      workflowId: string;
      body: NodeAddRequest;
    }) => {
      const response = await workflowApi.addNode(workflowId, body);
      return response.data.data;
    },
    onSuccess: syncWorkflowCache,
  });

export const useDeleteWorkflowNodeMutation = () =>
  useMutation({
    mutationFn: async ({
      workflowId,
      nodeId,
    }: {
      workflowId: string;
      nodeId: string;
    }) => {
      const response = await workflowApi.deleteNode(workflowId, nodeId);
      return response.data.data;
    },
    onSuccess: syncWorkflowCache,
  });

export const useWorkflowChoicesQuery = (
  workflowId: string | undefined,
  prevNodeId: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey:
      workflowId && prevNodeId
        ? QUERY_KEYS.workflowChoices(workflowId, prevNodeId)
        : ["workflows", "choices", "idle"],
    queryFn: async () => {
      if (!workflowId || !prevNodeId) {
        throw new Error("workflow id and prev node id are required");
      }

      const response = await workflowApi.getChoices(workflowId, prevNodeId);
      return response.data.data;
    },
    enabled: Boolean(workflowId && prevNodeId) && enabled,
    throwOnError: false,
  });

export const useSelectWorkflowChoiceMutation = () =>
  useMutation({
    mutationFn: async ({
      workflowId,
      prevNodeId,
      selectedOptionId,
      dataType,
      context,
    }: {
      workflowId: string;
      prevNodeId: string;
      selectedOptionId: string;
      dataType: string;
      context?: Record<string, unknown>;
    }) => {
      const response = await workflowApi.selectChoice(workflowId, prevNodeId, {
        selectedOptionId,
        dataType,
        context,
      });

      return response.data.data;
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

export type WorkflowChoiceData = ChoiceResponse;
export type WorkflowChoiceResult = NodeSelectionResult;
