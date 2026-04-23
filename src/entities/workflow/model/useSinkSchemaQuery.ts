import { useQuery } from "@tanstack/react-query";

import {
  type QueryPolicyOptions,
  resolveQueryPolicyOptions,
  toQueryMeta,
} from "@/shared/api";

import { workflowApi } from "../api";

import { workflowKeys } from "./query-keys";

export const useSinkSchemaQuery = (
  serviceKey: string | null | undefined,
  inputType: string | null | undefined,
  enabledOrOptions?:
    | boolean
    | QueryPolicyOptions<Awaited<ReturnType<typeof workflowApi.getSinkSchema>>>,
) => {
  const options = resolveQueryPolicyOptions(enabledOrOptions);

  return useQuery({
    queryKey:
      serviceKey && inputType
        ? workflowKeys.sinkSchema(serviceKey, inputType)
        : ["workflow", "editor-catalog", "sinks", "schema", "idle"],
    queryFn: () => {
      if (!serviceKey || !inputType) {
        throw new Error("service key and input type are required");
      }

      return workflowApi.getSinkSchema(serviceKey, inputType);
    },
    enabled: Boolean(serviceKey && inputType) && (options?.enabled ?? true),
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
};
