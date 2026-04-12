import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useCreateWorkflowShortcut } from "@/features/create-workflow";
import {
  type WorkflowResponse,
  buildPath,
  useInfiniteWorkflowListQuery,
  useToggleWorkflowActiveMutation,
} from "@/shared";

import { WORKFLOW_LIST_PAGE_SIZE } from "./constants";
import { type WorkflowFilterKey } from "./types";
import { sortWorkflowsByUpdatedAtDesc } from "./workflow-list";

export const useWorkflowsPage = () => {
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<WorkflowFilterKey>("all");
  const [togglingWorkflowId, setTogglingWorkflowId] = useState<string | null>(
    null,
  );
  const { createWorkflow, isPending: isCreatePending } =
    useCreateWorkflowShortcut();
  const { mutateAsync: toggleWorkflowActive } =
    useToggleWorkflowActiveMutation();
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteWorkflowListQuery(WORKFLOW_LIST_PAGE_SIZE);

  const workflows = useMemo(
    () =>
      sortWorkflowsByUpdatedAtDesc(
        data?.pages.flatMap((page) => page.content) ?? [],
      ),
    [data],
  );

  const filteredWorkflows = useMemo(() => {
    switch (activeFilter) {
      case "active":
        return workflows.filter((workflow) => workflow.active);
      case "inactive":
        return workflows.filter((workflow) => !workflow.active);
      case "all":
      default:
        return workflows;
    }
  }, [activeFilter, workflows]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      {
        rootMargin: "240px 0px",
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleCreateWorkflow = () => {
    void createWorkflow();
  };

  const handleOpenWorkflow = (workflowId: string) => {
    navigate(buildPath.workflowEditor(workflowId));
  };

  const handleToggleWorkflow = async (workflow: WorkflowResponse) => {
    setTogglingWorkflowId(workflow.id);

    try {
      await toggleWorkflowActive({
        workflowId: workflow.id,
        active: !workflow.active,
      });
    } finally {
      setTogglingWorkflowId(null);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return {
    activeFilter,
    setActiveFilter,
    filteredWorkflows,
    workflows,
    loadMoreRef,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    isCreatePending,
    togglingWorkflowId,
    handleCreateWorkflow,
    handleOpenWorkflow,
    handleToggleWorkflow,
    handleReload,
  };
};
