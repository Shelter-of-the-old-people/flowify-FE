import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { workflowApi } from "../api";
import { type SourceTargetOptionsParameters } from "../api";

import { workflowKeys } from "./query-keys";

export const useSourceTargetOptionsQuery = (
  serviceKey: string | undefined,
  params: SourceTargetOptionsParameters | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<
        Awaited<ReturnType<typeof workflowApi.getSourceTargetOptions>>
      >,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey:
      serviceKey && params?.mode
        ? workflowKeys.sourceTargetOptions(serviceKey, params)
        : ["workflow", "editor-catalog", "sources", "target-options", "idle"],
    queryFn: () => {
      if (!serviceKey || !params?.mode) {
        throw new Error("service key and target option mode are required");
      }

      return workflowApi.getSourceTargetOptions(serviceKey, params);
    },
    enabled: Boolean(serviceKey && params?.mode) && (options?.enabled ?? true),
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
