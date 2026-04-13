import { useQuery } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";
import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "../query-policy";

export const useWorkflowChoicesQuery = (
  workflowId: string | undefined,
  prevNodeId: string | null,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof workflowApi.getChoices>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey:
      workflowId && prevNodeId
        ? workflowKeys.choice(workflowId, prevNodeId)
        : ["workflow", "choices", "idle"],
    queryFn: () => {
      if (!workflowId || !prevNodeId) {
        throw new Error("workflow id and prev node id are required");
      }

      return workflowApi.getChoices(workflowId, prevNodeId);
    },
    enabled: Boolean(workflowId && prevNodeId) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
