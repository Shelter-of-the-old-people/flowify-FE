import { useInfiniteQuery } from "@tanstack/react-query";

import type { WorkflowListResponse } from "../../api";
import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";
import {
  type InfiniteQueryPolicyOptions,
  resolveInfiniteQueryPolicyOptions,
  toQueryMeta,
} from "../query-policy";

export const useInfiniteWorkflowListQuery = (
  size = 20,
  enabledOrOptions?: boolean | InfiniteQueryPolicyOptions<WorkflowListResponse>,
) => {
  const options = resolveInfiniteQueryPolicyOptions(enabledOrOptions);

  return useInfiniteQuery({
    queryKey: workflowKeys.infiniteList(size),
    queryFn: ({ pageParam }) => workflowApi.getList(pageParam, size),
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
