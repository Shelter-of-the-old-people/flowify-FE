import { useQuery } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";

export const useWorkflowQuery = (id: string | undefined) =>
  useQuery({
    queryKey: id ? workflowKeys.detail(id) : ["workflow", "unknown"],
    queryFn: () => {
      if (!id) {
        throw new Error("workflow id is required");
      }

      return workflowApi.getById(id);
    },
    enabled: Boolean(id),
    throwOnError: false,
  });
