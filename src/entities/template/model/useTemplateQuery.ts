import { useQuery } from "@tanstack/react-query";

import { type QueryPolicyOptions, toQueryMeta } from "@/shared/api";

import { templateApi } from "../api";

import { templateKeys } from "./query-keys";

export const useTemplateQuery = (
  id: string | undefined,
  options?: QueryPolicyOptions<Awaited<ReturnType<typeof templateApi.getById>>>,
) =>
  useQuery({
    queryKey: id ? templateKeys.detail(id) : ["template", "unknown"],
    queryFn: () => {
      if (!id) {
        throw new Error("template id is required");
      }

      return templateApi.getById(id);
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
