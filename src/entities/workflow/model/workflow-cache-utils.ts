import { type InfiniteData } from "@tanstack/react-query";

import { executionKeys } from "@/shared/constants";
import { queryClient } from "@/shared/libs";

import {
  type ChoiceResponse,
  type NodeSelectionResult,
  type WorkflowListResponse,
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

type WorkflowInfiniteListResponse = InfiniteData<WorkflowListResponse, number>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWorkflowListResponse = (
  value: unknown,
): value is WorkflowListResponse => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.content) &&
    typeof value.page === "number" &&
    typeof value.size === "number" &&
    typeof value.totalElements === "number" &&
    typeof value.totalPages === "number"
  );
};

const isWorkflowInfiniteListResponse = (
  value: unknown,
): value is WorkflowInfiniteListResponse => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.pages) &&
    Array.isArray(value.pageParams) &&
    value.pages.every(isWorkflowListResponse)
  );
};

const toTotalPages = (totalElements: number, size: number) => {
  if (totalElements === 0) {
    return 0;
  }

  return Math.ceil(totalElements / Math.max(size, 1));
};

const removeWorkflowFromListPage = (
  page: WorkflowListResponse,
  workflowId: string,
): WorkflowListResponse => {
  const nextContent = page.content.filter(
    (workflow) => workflow.id !== workflowId,
  );
  const totalElements = Math.max(page.totalElements - 1, 0);

  return {
    ...page,
    content:
      nextContent.length === page.content.length ? page.content : nextContent,
    totalElements,
    totalPages: toTotalPages(totalElements, page.size),
  };
};

const removeWorkflowFromInfiniteList = (
  data: WorkflowInfiniteListResponse,
  workflowId: string,
): WorkflowInfiniteListResponse => {
  const currentTotalElements = data.pages[0]?.totalElements ?? 0;
  const totalElements = Math.max(currentTotalElements - 1, 0);
  const flattenedWorkflows = data.pages.flatMap((page) => page.content);
  const nextWorkflows = flattenedWorkflows.filter(
    (workflow) => workflow.id !== workflowId,
  );

  if (nextWorkflows.length === flattenedWorkflows.length) {
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        totalElements,
        totalPages: toTotalPages(totalElements, page.size),
      })),
    };
  }

  const pages = data.pages
    .map((page, index) => {
      const startIndex = index * page.size;
      const content = nextWorkflows.slice(startIndex, startIndex + page.size);

      return {
        ...page,
        content,
        totalElements,
        totalPages: toTotalPages(totalElements, page.size),
      };
    })
    .filter((page, index) => index === 0 || page.content.length > 0);

  return {
    ...data,
    pages,
  };
};

export const pruneWorkflowListCaches = (workflowId: string) => {
  queryClient.setQueriesData(
    {
      queryKey: workflowKeys.lists(),
    },
    (currentData: unknown) => {
      if (isWorkflowInfiniteListResponse(currentData)) {
        return removeWorkflowFromInfiniteList(currentData, workflowId);
      }

      if (isWorkflowListResponse(currentData)) {
        return removeWorkflowFromListPage(currentData, workflowId);
      }

      return currentData;
    },
  );
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
