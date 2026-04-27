import { useMemo, useState } from "react";

import { useInfiniteWorkflowListQuery } from "@/entities/workflow";

import { WORKFLOW_LIST_PAGE_SIZE } from "./constants";
import { type WorkflowFilterKey } from "./types";
import {
  filterWorkflowsByStatus,
  getWorkflowListPageContent,
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
        data?.pages.flatMap(getWorkflowListPageContent) ?? [],
      ),
    [data],
  );

  const filteredWorkflows = filterWorkflowsByStatus(workflows, activeFilter);
  const hasWorkflows = workflows.length > 0;
  const handleReload = () => {
    void refetch();
  };

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
    handleReload,
  };
};
