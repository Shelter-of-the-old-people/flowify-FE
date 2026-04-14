import { useQuery } from "@tanstack/react-query";

import { workflowApi } from "../../api";
import { workflowKeys } from "../../constants";

export const useWorkflowListQuery = (page = 0, size = 20, enabled = true) =>
  useQuery({
    queryKey: workflowKeys.list({ page, size }),
    queryFn: () => workflowApi.getList(page, size),
    enabled,
    throwOnError: false,
  });
