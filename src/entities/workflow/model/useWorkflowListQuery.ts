import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import {
  type WorkflowListResponse,
  type WorkflowListStatusFilter,
  workflowApi,
} from "../api";

import { normalizeWorkflowListResponse } from "./normalize-workflow-list-response";
import { workflowKeys } from "./query-keys";

export const useWorkflowListQuery = (
  page = 0,
  size = 20,
  status: WorkflowListStatusFilter = "all",
  enabledOrOptions?: boolean | QueryPolicyOptions<WorkflowListResponse>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey: workflowKeys.list({ page, size, status }),
    queryFn: async () =>
      normalizeWorkflowListResponse(
        await workflowApi.getList(page, size, status),
        page,
        size,
      ),
    enabled: options?.enabled ?? true,
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
