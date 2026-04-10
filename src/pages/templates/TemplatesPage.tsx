import { useMemo, useState } from "react";
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

import { buildPath, useTemplateListQuery } from "@/shared";

const getTemplateDescription = (description: string) =>
  description?.trim().length > 0
    ? description
    : "설명이 아직 없는 템플릿입니다.";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<
    string | undefined
  >();
  const {
    data: templates,
    isLoading,
    isError,
    refetch,
  } = useTemplateListQuery(selectedCategory);

  const categories = useMemo(() => {
    const values = new Set<string>();

    for (const template of templates ?? []) {
      if (template.category) {
        values.add(template.category);
      }
    }

    return Array.from(values).sort();
  }, [templates]);

  return (
    <Box maxW="1200px" mx="auto">
      <Box mb={10}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
          TEMPLATES
        </Text>
        <Heading size="xl" mb={3}>
          바로 시작할 수 있는 템플릿
        </Heading>
        <Text color="gray.600">
          자주 쓰는 자동화 흐름을 살펴보고, 원하는 템플릿으로 새 워크플로우를
          빠르게 만들 수 있습니다.
        </Text>
      </Box>

      {categories.length > 0 ? (
        <HStack mb={6} gap={3} wrap="wrap">
          <Button
            variant={selectedCategory ? "outline" : "solid"}
            onClick={() => setSelectedCategory(undefined)}
          >
            전체
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "solid" : "outline"}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </HStack>
      ) : null}

      {isLoading ? (
        <VStack py={16} gap={4} color="gray.500">
          <Spinner size="lg" />
          <Text>템플릿 목록을 불러오는 중입니다.</Text>
        </VStack>
      ) : null}

      {isError ? (
        <VStack py={16} gap={4} color="gray.500">
          <Text>템플릿 목록을 불러오지 못했습니다.</Text>
          <Button variant="outline" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </VStack>
      ) : null}

      {!isLoading && !isError ? (
        <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} gap={5}>
          {(templates ?? []).length === 0 ? (
            <Box
              p={6}
              bg="white"
              border="1px dashed"
              borderColor="gray.300"
              borderRadius="24px"
            >
              <Heading size="md" mb={3}>
                표시할 템플릿이 없습니다
              </Heading>
              <Text color="gray.600">
                선택한 조건에 맞는 템플릿이 아직 없습니다. 카테고리를 바꾸거나
                잠시 뒤 다시 확인해보세요.
              </Text>
            </Box>
          ) : null}

          {(templates ?? []).map((template) => (
            <Box
              key={template.id}
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
                  <Heading size="md">{template.name}</Heading>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500">
                    {template.category ?? "미분류"}
                  </Text>
                </HStack>
                <Text color="gray.600" minH="72px">
                  {getTemplateDescription(template.description)}
                </Text>
              </Box>

              <HStack gap={2} wrap="wrap">
                <Text fontSize="sm" color="gray.500">
                  사용 {template.useCount}회
                </Text>
                <Text fontSize="sm" color="gray.500">
                  필요 서비스 {template.requiredServices.length}개
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {template.isSystem ? "시스템 템플릿" : "사용자 템플릿"}
                </Text>
              </HStack>

              <Text fontSize="sm" color="gray.500">
                생성 {new Date(template.createdAt).toLocaleString()}
              </Text>

              <Button
                alignSelf="flex-start"
                variant="outline"
                onClick={() => navigate(buildPath.templateDetail(template.id))}
              >
                상세 보기
              </Button>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}
    </Box>
  );
}
