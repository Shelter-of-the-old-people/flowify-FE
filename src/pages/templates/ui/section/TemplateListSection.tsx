import { Box, Button, Heading, Spinner, Text, VStack } from "@chakra-ui/react";

import { useTemplateListQuery } from "@/shared";

import { useTemplatesPage } from "../../model";
import { TemplateRow } from "../TemplateRow";

export const TemplateListSection = () => {
  const { handleOpenTemplate } = useTemplatesPage();
  const {
    data: templates,
    isLoading,
    isError,
    refetch,
  } = useTemplateListQuery();

  return (
    <VStack align="stretch" gap={0}>
      <Box mb={6}>
        <Heading fontSize="xl" fontWeight="semibold" color="text.primary">
          자동화 템플릿 목록
        </Heading>
        <Text mt={1} fontSize="sm" color="text.secondary">
          가장 기본적인 사용에 관한 템플릿
        </Text>
      </Box>

      {isLoading ? (
        <VStack py={16} gap={4} color="text.secondary">
          <Spinner size="lg" />
          <Text>템플릿 목록을 불러오는 중입니다.</Text>
        </VStack>
      ) : null}

      {isError ? (
        <VStack py={16} gap={4} color="text.secondary">
          <Text>템플릿 목록을 불러오지 못했습니다.</Text>
          <Button variant="outline" onClick={() => void refetch()}>
            다시 시도
          </Button>
        </VStack>
      ) : null}

      {!isLoading && !isError ? (
        <VStack align="stretch" gap={3}>
          {(templates ?? []).length === 0 ? (
            <Box
              p={6}
              bg="bg.surface"
              border="1px dashed"
              borderColor="border.default"
              borderRadius="2xl"
            >
              <Heading size="md" mb={3}>
                표시할 템플릿이 없습니다
              </Heading>
              <Text color="text.secondary">
                현재 표시할 수 있는 템플릿이 없습니다. 잠시 뒤 다시
                확인해보세요.
              </Text>
            </Box>
          ) : null}

          {(templates ?? []).map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              onOpen={() => handleOpenTemplate(template.id)}
            />
          ))}
        </VStack>
      ) : null}
    </VStack>
  );
};
