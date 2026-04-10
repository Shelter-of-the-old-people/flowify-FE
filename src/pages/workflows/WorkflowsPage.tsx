import { useNavigate } from "react-router";

import {
  Box,
  Button,
  HStack,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useCreateWorkflowShortcut } from "@/features/create-workflow";
import { buildPath, toWorkflowSummary, useWorkflowListQuery } from "@/shared";

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const { createWorkflow, isPending: isCreatePending } =
    useCreateWorkflowShortcut();
  const { data, isLoading, isError } = useWorkflowListQuery();
  const workflows = (data?.content ?? []).map(toWorkflowSummary);

  return (
    <Box maxW="1200px" mx="auto">
      <HStack justify="space-between" align="flex-start" mb={10} gap={6}>
        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
            MY WORKFLOWS
          </Text>
          <Heading size="xl" mb={3}>
            워크플로우
          </Heading>
          <Text color="gray.600">
            저장된 플로우 목록, 최근 수정 내역, 새 플로우 시작 지점을 한곳에서
            확인합니다.
          </Text>
        </Box>

        <Button
          bg="gray.900"
          color="white"
          onClick={() => void createWorkflow()}
          disabled={isCreatePending}
          _hover={{ bg: "gray.800" }}
        >
          {isCreatePending ? "생성 중..." : "새 워크플로우"}
        </Button>
      </HStack>

      {isLoading ? (
        <VStack py={16} gap={4} color="gray.500">
          <Spinner size="lg" />
          <Text>워크플로우 목록을 불러오는 중입니다.</Text>
        </VStack>
      ) : null}

      {isError ? (
        <VStack py={16} gap={4} color="gray.500">
          <Text>목록을 불러오지 못했습니다.</Text>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </VStack>
      ) : null}

      {!isLoading && !isError ? (
        <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} gap={5}>
          {workflows.length === 0 ? (
            <Box
              p={6}
              bg="white"
              border="1px dashed"
              borderColor="gray.300"
              borderRadius="24px"
            >
              <Heading size="md" mb={3}>
                첫 워크플로우 시작
              </Heading>
              <Text color="gray.600" mb={4}>
                아직 저장된 워크플로우가 없습니다. 새 플로우 생성 뒤 에디터로
                바로 이동할 수 있습니다.
              </Text>
              <Button
                onClick={() => void createWorkflow()}
                disabled={isCreatePending}
              >
                새 워크플로우
              </Button>
            </Box>
          ) : null}

          {workflows.map((workflow) => (
            <Box
              key={workflow.id}
              p={6}
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="24px"
              boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
              display="flex"
              flexDirection="column"
              gap={4}
            >
              <Box>
                <HStack justify="space-between" align="flex-start" mb={2}>
                  <Heading size="md">{workflow.name}</Heading>
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    color={workflow.isActive ? "green.600" : "gray.500"}
                  >
                    {workflow.status === "active" ? "활성" : "비활성"}
                  </Text>
                </HStack>
                <Text color="gray.600" minH="48px">
                  {workflow.description || "설명 없이 저장된 워크플로우입니다."}
                </Text>
              </Box>

              <Text fontSize="sm" color="gray.500">
                최근 수정 {new Date(workflow.updatedAt).toLocaleString()}
              </Text>

              <Button
                alignSelf="flex-start"
                variant="outline"
                onClick={() => navigate(buildPath.workflowEditor(workflow.id))}
              >
                에디터 열기
              </Button>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}
    </Box>
  );
}
