import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { workflowApi } from "../api";
import { type ChoiceQueryContext } from "../api";

import { workflowKeys } from "./query-keys";

export const useWorkflowChoicesQuery = (
  workflowId: string | undefined,
  prevNodeId: string | null,
  context?: ChoiceQueryContext,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof workflowApi.getChoices>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey:
      workflowId && prevNodeId
        ? workflowKeys.choice(workflowId, prevNodeId, context)
        : ["workflow", "choices", "idle"],
    queryFn: () => {
      if (!workflowId || !prevNodeId) {
        throw new Error("workflow id and prev node id are required");
      }

      return workflowApi.getChoices(workflowId, prevNodeId, context);
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
