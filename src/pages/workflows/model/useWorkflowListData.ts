import { useMemo, useState } from "react";

import { useInfiniteWorkflowListQuery } from "@/shared";

import { WORKFLOW_LIST_PAGE_SIZE } from "./constants";
import { type WorkflowFilterKey } from "./types";
import {
  filterWorkflowsByStatus,
  sortWorkflowsByUpdatedAtDesc,
} from "./workflow-list";

export const useWorkflowListData = () => {
  const [activeFilter, setActiveFilter] = useState<WorkflowFilterKey>("all");
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteWorkflowListQuery(WORKFLOW_LIST_PAGE_SIZE);

  const workflows = useMemo(
    () =>
      sortWorkflowsByUpdatedAtDesc(
        data?.pages.flatMap((page) => page.content) ?? [],
      ),
    [data],
  );

  const filteredWorkflows = filterWorkflowsByStatus(workflows, activeFilter);
  const hasWorkflows = workflows.length > 0;

  return {
    activeFilter,
    setActiveFilter,
    hasWorkflows,
    filteredWorkflows,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  };
};
