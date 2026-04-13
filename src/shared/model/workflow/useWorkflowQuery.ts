import { useQuery } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";
import { type QueryPolicyOptions, toQueryMeta } from "../query-policy";

export const useWorkflowQuery = (
  id: string | undefined,
  options?: QueryPolicyOptions<Awaited<ReturnType<typeof workflowApi.getById>>>,
) =>
  useQuery({
    queryKey: id ? workflowKeys.detail(id) : ["workflow", "unknown"],
    queryFn: () => {
      if (!id) {
        throw new Error("workflow id is required");
      }

      return workflowApi.getById(id);
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
