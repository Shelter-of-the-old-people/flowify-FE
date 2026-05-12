import {
  invalidateWorkflowLists,
  isExecutionInFlight,
  useExecuteWorkflowMutation,
  useLatestWorkflowExecutionQuery,
  useStopExecutionMutation,
} from "@/entities";
import { getApiErrorMessage, toaster } from "@/shared/utils";

export type WorkflowExecutionActionKind = "run" | "stop";

type UseWorkflowExecutionActionResult = {
  actionKind: WorkflowExecutionActionKind;
  actionLabel: string;
  isActionPending: boolean;
  isRunning: boolean;
  handleAction: () => Promise<void>;
};

export const useWorkflowExecutionAction = (
  workflowId: string | undefined,
): UseWorkflowExecutionActionResult => {
  const latestExecutionQuery = useLatestWorkflowExecutionQuery(workflowId, {
    refetchOnMount: "always",
    staleTime: 0,
  });
  const { mutateAsync: executeWorkflow, isPending: isExecutePending } =
    useExecuteWorkflowMutation({
      showErrorToast: false,
    });
  const { mutateAsync: stopExecution, isPending: isStopPending } =
    useStopExecutionMutation({
      showErrorToast: false,
    });

  const latestExecution = latestExecutionQuery.data ?? null;
  const isRunning = isExecutionInFlight(latestExecution?.state);
  const isCheckingLatestExecution =
    latestExecutionQuery.isFetching &&
    !latestExecutionQuery.isFetchedAfterMount;
  const isActionPending =
    latestExecutionQuery.isLoading ||
    isCheckingLatestExecution ||
    isExecutePending ||
    isStopPending;
  const actionKind: WorkflowExecutionActionKind = isRunning ? "stop" : "run";
  const actionLabel = isRunning ? "워크플로우 중지" : "워크플로우 실행";

  const handleAction = async () => {
    if (!workflowId || isActionPending) {
      return;
    }

    if (isExecutionInFlight(latestExecution?.state)) {
      if (!latestExecution?.id) {
        toaster.create({
          title: "중지 실패",
          description: "중지할 실행이 없습니다.",
          type: "error",
        });
        return;
      }

      try {
        await stopExecution({
          workflowId,
          executionId: latestExecution.id,
        });
        await latestExecutionQuery.refetch();
        await invalidateWorkflowLists();
      } catch (error) {
        toaster.create({
          title: "중지 실패",
          description: getApiErrorMessage(error),
          type: "error",
        });
      }

      return;
    }

    try {
      await executeWorkflow(workflowId);
      await latestExecutionQuery.refetch();
      await invalidateWorkflowLists();
    } catch (error) {
      toaster.create({
        title: "실행 실패",
        description: getApiErrorMessage(error),
        type: "error",
      });
    }
  };

  return {
    actionKind,
    actionLabel,
    isActionPending,
    isRunning,
    handleAction,
  };
};
