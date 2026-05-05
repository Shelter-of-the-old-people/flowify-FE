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
import { WorkflowRowItem } from "../WorkflowRowItem";

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
    handleReload,
  } = useWorkflowListData();
  const { isCreatePending, handleCreateWorkflow, handleOpenWorkflow } =
    useWorkflowListActions();
  const loadMoreRef = useWorkflowListInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

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
              <WorkflowRowItem
                key={workflow.id}
                workflow={workflow}
                onOpen={() => handleOpenWorkflow(workflow.id)}
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
