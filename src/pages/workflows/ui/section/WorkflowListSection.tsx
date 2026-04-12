import { MdAdd } from "react-icons/md";

import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useWorkflowsPage } from "../../model";
import { WorkflowFilterTabs } from "../WorkflowFilterTabs";
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
  } = useWorkflowsPage();

  return (
    <VStack align="stretch" gap={6}>
      <Flex align="center" justify="space-between" gap={6} wrap="wrap">
        <Box>
          <Text fontSize="xl" fontWeight="bold" color="text.primary">
            내 자동화 목록
          </Text>
          <Text mt={1} fontSize="sm" color="text.secondary">
            내가 구축한 자동화 시스템 목록
          </Text>
        </Box>

        <Button
          bg="black"
          color="bg.surface"
          px={3}
          py={1.5}
          h="auto"
          borderRadius="xl"
          fontSize="sm"
          fontWeight="semibold"
          display="inline-flex"
          alignItems="center"
          gap={2}
          disabled={isCreatePending}
          _hover={{ bg: "neutral.900" }}
          onClick={handleCreateWorkflow}
        >
          <Icon as={MdAdd} boxSize={3} />
          {isCreatePending ? "자동화 시스템 생성 중.." : "자동화 시스템 만들기"}
        </Button>
      </Flex>

      <Box>
        <WorkflowFilterTabs
          activeFilter={activeFilter}
          onChange={setActiveFilter}
        />

        {isLoading ? (
          <VStack py={16} gap={4} color="text.secondary">
            <Spinner size="lg" />
            <Text>자동화 목록을 불러오는 중입니다.</Text>
          </VStack>
        ) : null}

        {isError ? (
          <VStack py={16} gap={4} color="text.secondary">
            <Text>자동화 목록을 불러오지 못했습니다.</Text>
            <Button variant="outline" onClick={handleReload}>
              다시 시도
            </Button>
          </VStack>
        ) : null}

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
              <Box
                p={6}
                bg="bg.surface"
                border="1px dashed"
                borderColor="border.default"
                borderRadius="2xl"
              >
                <Text fontSize="sm" fontWeight="medium" color="text.primary">
                  {workflows.length === 0
                    ? "아직 구축한 자동화가 없습니다."
                    : "선택한 상태의 자동화가 없습니다."}
                </Text>
                <Text mt={2} fontSize="xs" color="text.secondary">
                  첫 자동화를 만들고 워크플로우 편집기로 바로 이동해보세요.
                </Text>
                {workflows.length === 0 ? (
                  <Button
                    mt={4}
                    size="sm"
                    bg="black"
                    color="bg.surface"
                    disabled={isCreatePending}
                    _hover={{ bg: "neutral.900" }}
                    onClick={handleCreateWorkflow}
                  >
                    자동화 시스템 만들기
                  </Button>
                ) : null}
              </Box>
            ) : null}
          </VStack>
        ) : null}
      </Box>
    </VStack>
  );
};
