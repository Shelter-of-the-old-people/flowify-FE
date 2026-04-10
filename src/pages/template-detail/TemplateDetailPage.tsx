import { useNavigate, useParams } from "react-router";

import {
  Box,
  Button,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  ROUTE_PATHS,
  buildPath,
  useInstantiateTemplateMutation,
  useTemplateQuery,
} from "@/shared";

const getTemplateDescription = (description: string) =>
  description?.trim().length > 0
    ? description
    : "설명이 아직 없는 템플릿입니다.";

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, isError, refetch } = useTemplateQuery(id);
  const { mutateAsync: instantiateTemplate, isPending } =
    useInstantiateTemplateMutation();

  const handleInstantiate = async () => {
    if (!id) {
      return;
    }

    try {
      const workflow = await instantiateTemplate(id);
      navigate(buildPath.workflowEditor(workflow.id));
    } catch {
      // 에러 상태는 화면 상단 안내로 충분하다.
    }
  };

  if (isLoading) {
    return (
      <VStack py={16} gap={4} color="gray.500">
        <Spinner size="lg" />
        <Text>템플릿 정보를 불러오는 중입니다.</Text>
      </VStack>
    );
  }

  if (isError || !template) {
    return (
      <VStack py={16} gap={4} color="gray.500">
        <Text>템플릿 정보를 불러오지 못했습니다.</Text>
        <HStack>
          <Button
            variant="outline"
            onClick={() => navigate(ROUTE_PATHS.TEMPLATES)}
          >
            목록으로 이동
          </Button>
          <Button variant="outline" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </HStack>
      </VStack>
    );
  }

  return (
    <Box maxW="960px" mx="auto">
      <VStack align="stretch" gap={6}>
        <Box
          p={{ base: 6, md: 8 }}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
            TEMPLATE DETAIL
          </Text>
          <Heading size="xl" mb={3}>
            {template.name}
          </Heading>
          <Text color="gray.600" mb={8}>
            {getTemplateDescription(template.description)}
          </Text>

          <HStack gap={3} wrap="wrap" mb={6}>
            <Text fontSize="sm" color="gray.500">
              카테고리 {template.category ?? "미분류"}
            </Text>
            <Text fontSize="sm" color="gray.500">
              노드 {template.nodes.length}개
            </Text>
            <Text fontSize="sm" color="gray.500">
              엣지 {template.edges.length}개
            </Text>
            <Text fontSize="sm" color="gray.500">
              사용 {template.useCount}회
            </Text>
          </HStack>

          <HStack gap={3}>
            <Button
              onClick={() => void handleInstantiate()}
              disabled={isPending}
            >
              {isPending ? "생성 중..." : "템플릿으로 시작"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.TEMPLATES)}
            >
              목록으로
            </Button>
          </HStack>
        </Box>

        <Box
          p={{ base: 6, md: 8 }}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Heading size="md" mb={4}>
            필요 서비스
          </Heading>
          {template.requiredServices.length === 0 ? (
            <Text color="gray.600">
              연결이 필요한 외부 서비스가 아직 표시되지 않았습니다.
            </Text>
          ) : (
            <HStack gap={3} wrap="wrap">
              {template.requiredServices.map((service) => (
                <Box
                  key={service}
                  px={4}
                  py={2}
                  bg="gray.50"
                  borderRadius="full"
                  border="1px solid"
                  borderColor="gray.200"
                >
                  <Text fontSize="sm" fontWeight="medium">
                    {service}
                  </Text>
                </Box>
              ))}
            </HStack>
          )}
        </Box>

        <Box
          p={{ base: 6, md: 8 }}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Heading size="md" mb={4}>
            구성 요약
          </Heading>
          <VStack align="stretch" gap={3}>
            {template.nodes.map((node) => (
              <Box
                key={node.id}
                display="flex"
                justifyContent="space-between"
                gap={4}
                px={4}
                py={3}
                borderRadius="16px"
                bg="gray.50"
              >
                <Text fontWeight="medium">{node.label ?? node.type}</Text>
                <Text fontSize="sm" color="gray.500">
                  {node.category ?? "unknown"} / {node.type}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
