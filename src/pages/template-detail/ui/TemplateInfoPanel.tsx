import { Badge, Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

import {
  type TemplateDetail,
  getTemplateCategoryLabel,
} from "@/entities/template";
import { TemplateServiceIcon } from "@/pages/templates/ui";

import {
  getTemplateDescription,
  getTemplateMetaItems,
  getTemplatePreviewSummary,
  getTemplateRuntimeSummary,
} from "../model";

import { TemplateMetaSection } from "./TemplateMetaSection";
import { TemplateRequiredServices } from "./TemplateRequiredServices";

type Props = {
  template: TemplateDetail;
  isPending: boolean;
  onInstantiate: () => void;
  onBack: () => void;
};

export const TemplateInfoPanel = ({
  template,
  isPending,
  onInstantiate,
  onBack,
}: Props) => {
  const metaItems = getTemplateMetaItems(template);
  const categoryLabel = getTemplateCategoryLabel(template.category);
  const runtimeSummary = getTemplateRuntimeSummary(template);

  return (
    <Box
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="40px"
      boxShadow="0 10px 30px rgba(15, 23, 42, 0.05)"
      minH={{ base: "auto", lg: "calc(100vh - 128px)" }}
      px={{ base: 6, lg: 10 }}
      py={{ base: 6, lg: 10 }}
    >
      <VStack align="stretch" h="full" gap={8}>
        <VStack align="stretch" gap={4}>
          <TemplateServiceIcon
            icon={template.icon}
            requiredServices={template.requiredServices}
          />

          <VStack align="stretch" gap={2}>
            <Badge
              alignSelf="flex-start"
              px={2.5}
              py={1}
              borderRadius="999px"
              bg="bg.muted"
              color="text.secondary"
              fontSize="11px"
              fontWeight="medium"
            >
              {categoryLabel}
            </Badge>

            <Heading size="xl" color="text.primary">
              {template.name}
            </Heading>

            <Text fontSize="sm" color="text.secondary">
              {getTemplateDescription(template)}
            </Text>

            {runtimeSummary ? (
              <Box
                mt={2}
                px={3}
                py={2.5}
                borderRadius="18px"
                bg="bg.muted"
                border="1px solid"
                borderColor="border.default"
              >
                <Text fontSize="xs" fontWeight="semibold" color="text.primary">
                  현재 동작 기준
                </Text>
                <Text mt={1} fontSize="xs" color="text.secondary">
                  {runtimeSummary}
                </Text>
              </Box>
            ) : null}
          </VStack>
        </VStack>

        <VStack align="stretch" gap={2}>
          <Text fontSize="sm" fontWeight="semibold" color="text.primary">
            무엇을 하나요?
          </Text>
          <Text fontSize="sm" color="text.secondary">
            {getTemplatePreviewSummary(template)}
          </Text>
        </VStack>

        <VStack align="stretch" gap={3}>
          <Text fontSize="sm" fontWeight="semibold" color="text.primary">
            템플릿 정보
          </Text>
          <TemplateMetaSection items={metaItems} />
        </VStack>

        <VStack align="stretch" gap={3}>
          <Text fontSize="sm" fontWeight="semibold" color="text.primary">
            필요한 서비스
          </Text>
          <TemplateRequiredServices services={template.requiredServices} />
        </VStack>

        <VStack align="stretch" mt="auto" gap={3}>
          <Button onClick={onInstantiate} disabled={isPending} size="md">
            {isPending ? "가져오는 중..." : "가져오기"}
          </Button>
          <Button variant="outline" onClick={onBack} size="md">
            목록으로
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};
