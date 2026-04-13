import { MdMoreHoriz, MdWidgets } from "react-icons/md";

import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";

import type { TemplateSummary } from "@/shared";

import { getTemplateDescription } from "../model";

type Props = {
  template: TemplateSummary;
  onOpen: () => void;
};

export const TemplateRow = ({ template, onOpen }: Props) => {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={4}
      p={4}
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="10px"
    >
      <HStack gap={6} minW={0} flex={1}>
        <Flex
          boxSize="38px"
          align="center"
          justify="center"
          borderRadius="lg"
          bg="bg.overlay"
          border="1px solid"
          borderColor="border.default"
          flexShrink={0}
        >
          <Icon as={MdWidgets} boxSize={5} color="text.primary" />
        </Flex>

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
          <Box h="18px" />
        </VStack>
      </HStack>

      <IconButton
        aria-label="템플릿 상세 보기"
        variant="ghost"
        size="sm"
        flexShrink={0}
        onClick={onOpen}
      >
        <MdMoreHoriz />
      </IconButton>
    </Flex>
  );
};
