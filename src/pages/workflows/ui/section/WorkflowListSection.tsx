import { Box, HStack, Spinner, Text, VStack } from "@chakra-ui/react";

import {
  useWorkflowListActions,
  useWorkflowListData,
  useWorkflowListInfiniteScroll,
} from "../../model";
import { WorkflowFilterTabs } from "../WorkflowFilterTabs";
import { WorkflowListEmptyState } from "../WorkflowListEmptyState";
import { WorkflowListErrorState } from "../WorkflowListErrorState";
import { WorkflowListHeader } from "../WorkflowListHeader";
import { WorkflowListLoadingState } from "../WorkflowListLoadingState";
import { WorkflowRow } from "../WorkflowRow";

export const WorkflowListSection = () => {
  const {
    activeFilter,
    setActiveFilter,
    filteredWorkflows,
    hasWorkflows,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useWorkflowListData();
  const {
    isCreatePending,
    togglingWorkflowId,
    handleCreateWorkflow,
    handleOpenWorkflow,
    handleToggleWorkflow,
  } = useWorkflowListActions();
  const loadMoreRef = useWorkflowListInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  const handleReload = () => {
    void refetch();
  };

  return (
    <VStack align="stretch" gap={6}>
      <WorkflowListHeader
        isCreatePending={isCreatePending}
        onCreate={handleCreateWorkflow}
      />

      <Box>
        <WorkflowFilterTabs
          activeFilter={activeFilter}
          onChange={setActiveFilter}
        />

        {isLoading ? <WorkflowListLoadingState /> : null}

        {isError ? <WorkflowListErrorState onReload={handleReload} /> : null}

        {!isLoading && !isError ? (
          <VStack align="stretch" gap={3}>
            {filteredWorkflows.map((workflow) => (
              <WorkflowRow
                key={workflow.id}
                workflow={workflow}
                isTogglePending={togglingWorkflowId === workflow.id}
                onOpen={() => handleOpenWorkflow(workflow.id)}
                onToggle={() => void handleToggleWorkflow(workflow)}
              />
            ))}

            {hasNextPage ? <Box ref={loadMoreRef} h="1px" /> : null}

            {isFetchingNextPage ? (
              <HStack justify="center" py={4} color="text.secondary">
                <Spinner size="sm" />
                <Text fontSize="xs">다음 자동화 목록을 불러오는 중입니다.</Text>
              </HStack>
            ) : null}

            {filteredWorkflows.length === 0 ? (
              <WorkflowListEmptyState
                hasWorkflows={hasWorkflows}
                isCreatePending={isCreatePending}
                onCreate={handleCreateWorkflow}
              />
            ) : null}
          </VStack>
        ) : null}
      </Box>
    </VStack>
  );
};
