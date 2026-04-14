import { useInfiniteQuery } from "@tanstack/react-query";

import type { WorkflowListResponse } from "../../api";
import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";

export const useInfiniteWorkflowListQuery = (size = 20, enabled = true) =>
  useInfiniteQuery({
    queryKey: workflowKeys.infiniteList(size),
    queryFn: ({ pageParam }) => workflowApi.getList(pageParam, size),
    enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage: WorkflowListResponse) => {
      const nextPage = lastPage.page + 1;
      return nextPage < lastPage.totalPages ? nextPage : undefined;
    },
    throwOnError: false,
  });
