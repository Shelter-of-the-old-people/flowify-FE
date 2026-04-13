import { useQuery } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";
import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "../query-policy";

export const useWorkflowListQuery = (
  page = 0,
  size = 20,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof workflowApi.getList>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey: workflowKeys.list({ page, size }),
    queryFn: () => workflowApi.getList(page, size),
    enabled: options?.enabled ?? true,
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
