import { useInfiniteQuery } from "@tanstack/react-query";

import {
  type InfiniteQueryPolicyOptions,
  resolveInfiniteQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import {
  type WorkflowListResponse,
  type WorkflowListStatusFilter,
  workflowApi,
} from "../api";

import { normalizeWorkflowListResponse } from "./normalize-workflow-list-response";
import { workflowKeys } from "./query-keys";

export const useInfiniteWorkflowListQuery = (
  size = 20,
  status: WorkflowListStatusFilter = "all",
  enabledOrOptions?: boolean | InfiniteQueryPolicyOptions<WorkflowListResponse>,
) => {
  const options = resolveInfiniteQueryPolicyOptions(enabledOrOptions);

  return useInfiniteQuery({
    queryKey: workflowKeys.infiniteList(size, status),
    queryFn: async ({ pageParam }) =>
      normalizeWorkflowListResponse(
        await workflowApi.getList(pageParam, size, status),
        pageParam,
        size,
      ),
    enabled: options?.enabled ?? true,
    initialPageParam: 0,
    getNextPageParam: (lastPage: WorkflowListResponse) => {
      const nextPage = lastPage.page + 1;
      return nextPage < lastPage.totalPages ? nextPage : undefined;
    },
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
