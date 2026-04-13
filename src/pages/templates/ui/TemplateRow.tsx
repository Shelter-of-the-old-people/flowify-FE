import type { KeyboardEvent, MouseEvent } from "react";
import { MdMoreHoriz } from "react-icons/md";

import { Box, Flex, HStack, IconButton, Text, VStack } from "@chakra-ui/react";

import type { TemplateSummary } from "@/shared";

import {
  getRelativeCreatedLabel,
  getTemplateDescription,
  getTemplateMetaLabel,
} from "../model";

import { TemplateServiceIcon } from "./TemplateServiceIcon";

type Props = {
  template: TemplateSummary;
  onOpen: () => void;
};

export const TemplateRow = ({ template, onOpen }: Props) => {
  const relativeCreatedLabel = getRelativeCreatedLabel(template.createdAt);
  const metaLabel = getTemplateMetaLabel(template);

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpen();
  };

  return (
    <Box role="group">
      <Flex
        align="center"
        justify="space-between"
        gap={4}
        p={4}
        bg="bg.surface"
        border="1px solid"
        borderColor="border.default"
        borderRadius="10px"
        cursor="pointer"
        transition="border-color 220ms ease, box-shadow 220ms ease"
        _hover={{
          borderColor: "neutral.200",
          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
        }}
        _active={{
          bg: "bg.surface",
        }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "neutral.950",
          outlineOffset: "2px",
        }}
        onClick={onOpen}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
      >
        <HStack gap={6} minW={0} flex={1}>
          <TemplateServiceIcon
            icon={template.icon}
            requiredServices={template.requiredServices}
          />

          <VStack align="stretch" gap={0.5} minW={0} flex={1}>
            <Text
              fontSize="md"
              fontWeight="semibold"
              color="text.primary"
              lineClamp={1}
            >
              {template.name}
            </Text>
            <Text fontSize="xs" color="text.primary" lineClamp={1}>
              {getTemplateDescription(template.description)}
            </Text>
            <HStack gap={2} color="text.secondary">
              <Text fontSize="xs" lineClamp={1}>
                {relativeCreatedLabel}
              </Text>
              <Box w="1px" h="10px" bg="text.secondary" flexShrink={0} />
              <Text fontSize="xs" lineClamp={1}>
                {metaLabel}
              </Text>
            </HStack>
          </VStack>
        </HStack>

        <IconButton
          aria-label="템플릿 상세 보기"
          variant="ghost"
          size="sm"
          flexShrink={0}
          onClick={handleActionClick}
        >
          <MdMoreHoriz />
        </IconButton>
      </Flex>
    </Box>
  );
};
