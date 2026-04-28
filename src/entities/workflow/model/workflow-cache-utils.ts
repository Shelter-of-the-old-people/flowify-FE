import { executionKeys } from "@/shared/constants";
import { queryClient } from "@/shared/libs";

import {
  type ChoiceResponse,
  type NodeSelectionResult,
  type WorkflowResponse,
  workflowApi,
} from "../api";

import { workflowKeys } from "./query-keys";
import { type WorkflowSummary } from "./types";
import { getWorkflowStatus } from "./types";

export const cacheWorkflowDetail = (workflow: WorkflowResponse) => {
  queryClient.setQueryData(workflowKeys.detail(workflow.id), workflow);
};

export const invalidateWorkflowLists = async () => {
  await queryClient.invalidateQueries({
    queryKey: workflowKeys.lists(),
  });
};

export const syncWorkflowCache = async (workflow: WorkflowResponse) => {
  cacheWorkflowDetail(workflow);
  await invalidateWorkflowLists();
};

export const fetchWorkflowDetail = async (workflowId: string) =>
  queryClient.fetchQuery({
    queryKey: workflowKeys.detail(workflowId),
    queryFn: () => workflowApi.getById(workflowId),
    staleTime: 0,
  });

export const getWorkflowDetailOrFallback = async (
  workflowId: string,
  fallbackWorkflow: WorkflowResponse,
) => {
  try {
    return await fetchWorkflowDetail(workflowId);
  } catch {
    return fallbackWorkflow;
  }
};

export const removeWorkflowDomainCache = async (workflowId: string) => {
  queryClient.removeQueries({
    queryKey: workflowKeys.detail(workflowId),
  });
  queryClient.removeQueries({
    queryKey: workflowKeys.choicesRoot(workflowId),
  });
  queryClient.removeQueries({
    queryKey: executionKeys.workflow(workflowId),
  });
  await invalidateWorkflowLists();
};

export const toWorkflowSummary = (
  workflow: WorkflowResponse,
): WorkflowSummary => ({
  id: workflow.id,
  name: workflow.name,
  description: workflow.description,
  active: workflow.active,
  status: getWorkflowStatus(workflow.active),
  createdAt: workflow.createdAt,
  updatedAt: workflow.updatedAt,
});

export type WorkflowChoiceData = ChoiceResponse;
export type WorkflowChoiceResult = NodeSelectionResult;
