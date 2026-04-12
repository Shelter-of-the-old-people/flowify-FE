import { Box, HStack, Spinner, Text, VStack } from "@chakra-ui/react";

import { useWorkflowListSection } from "../../model";
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
  } = useWorkflowListSection();

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
                hasWorkflows={workflows.length > 0}
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
