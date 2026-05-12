import { useMemo, useState } from "react";

import { useInfiniteWorkflowListQuery } from "@/entities/workflow";

import { WORKFLOW_LIST_PAGE_SIZE } from "./constants";
import { type WorkflowFilterKey } from "./types";
import {
  getWorkflowListPageContent,
  sortWorkflowsByUpdatedAtDesc,
} from "./workflow-list";

export const useWorkflowListData = () => {
  const [statusFilter, setStatusFilter] = useState<WorkflowFilterKey>("all");
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteWorkflowListQuery(WORKFLOW_LIST_PAGE_SIZE, statusFilter);

  const workflows = useMemo(
    () =>
      sortWorkflowsByUpdatedAtDesc(
        data?.pages.flatMap(getWorkflowListPageContent) ?? [],
      ),
    [data],
  );

  const filteredWorkflows = workflows;
  const handleReload = () => {
    void refetch();
  };

  return {
    activeFilter: statusFilter,
    setActiveFilter: setStatusFilter,
    filteredWorkflows,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    handleReload,
  };
};
