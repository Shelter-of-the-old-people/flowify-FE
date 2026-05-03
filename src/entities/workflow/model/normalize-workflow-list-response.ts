import { type PageResponse } from "@/shared";

import {
  type RawWorkflowListResponse,
  type WorkflowListResponse,
  type WorkflowResponse,
} from "../api";

const isWorkflowRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWorkflowResponse = (value: unknown): value is WorkflowResponse =>
  isWorkflowRecord(value) && typeof value.id === "string";

const isWorkflowResponseArray = (
  value: RawWorkflowListResponse,
): value is WorkflowResponse[] =>
  Array.isArray(value) && value.every(isWorkflowResponse);

const isWorkflowListPageResponse = (
  value: RawWorkflowListResponse,
): value is WorkflowListResponse => {
  if (!isWorkflowRecord(value)) {
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

const toWorkflowListPageResponse = (
  content: WorkflowResponse[],
  page: number,
  size: number,
  totalElements: number,
): WorkflowListResponse => ({
  content,
  page,
  size,
  totalElements,
  totalPages: totalElements === 0 ? 0 : Math.ceil(totalElements / size),
});

const getWorkflowPageSlice = (
  workflows: WorkflowResponse[],
  page: number,
  size: number,
) => {
  const startIndex = page * size;
  const endIndex = startIndex + size;
  return workflows.slice(startIndex, endIndex);
};

export const createEmptyWorkflowListResponse = (
  page = 0,
  size = 20,
): WorkflowListResponse => toWorkflowListPageResponse([], page, size, 0);

export const normalizeWorkflowListResponse = (
  response: RawWorkflowListResponse,
  page = 0,
  size = 20,
): WorkflowListResponse => {
  if (isWorkflowListPageResponse(response)) {
    return response;
  }

  if (isWorkflowResponseArray(response)) {
    return toWorkflowListPageResponse(
      getWorkflowPageSlice(response, page, size),
      page,
      size,
      response.length,
    );
  }

  return createEmptyWorkflowListResponse(page, size);
};

export const getWorkflowListContent = (
  response: PageResponse<WorkflowResponse> | null | undefined,
) => response?.content ?? [];
