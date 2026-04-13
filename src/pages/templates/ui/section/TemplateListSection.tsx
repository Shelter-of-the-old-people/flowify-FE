import { Box, Heading, Text, VStack } from "@chakra-ui/react";

import { useTemplateListData, useTemplatesPage } from "../../model";
import { TemplateListEmptyState } from "../TemplateListEmptyState";
import { TemplateListErrorState } from "../TemplateListErrorState";
import { TemplateListLoadingState } from "../TemplateListLoadingState";
import { TemplateRow } from "../TemplateRow";

export const TemplateListSection = () => {
  const { templates, hasTemplates, isLoading, isError, handleReload } =
    useTemplateListData();
  const { handleOpenTemplate } = useTemplatesPage();

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

      {isLoading ? <TemplateListLoadingState /> : null}

      {isError ? <TemplateListErrorState onReload={handleReload} /> : null}

      {!isLoading && !isError ? (
        <VStack align="stretch" gap={3}>
          {!hasTemplates ? <TemplateListEmptyState /> : null}

          {templates.map((template) => (
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
