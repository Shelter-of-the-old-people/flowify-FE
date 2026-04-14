import { type KeyboardEvent, type MouseEvent } from "react";
import { MdPause, MdPlayArrow } from "react-icons/md";

import {
  Box,
  Flex,
  HStack,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { ServiceBadge } from "@/shared";

import { type DashboardIssue } from "../model";

type Props = {
  issue: DashboardIssue;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  isTogglePending: boolean;
  onToggleWorkflow: () => void;
};

export const DashboardErrorCard = ({
  issue,
  isActive,
  isExpanded,
  onToggle,
  isTogglePending,
  onToggleWorkflow,
}: Props) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  const handleToggleWorkflowClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleWorkflow();
  };

  const toggleButtonLabel = isActive ? "자동화 중지" : "자동화 실행";

  return (
    <Box
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="10px"
      boxShadow="0 0 4px rgba(239, 61, 61, 0.24)"
      p={4}
      cursor="pointer"
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      <Flex
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        direction={{ base: "column", md: "row" }}
        gap={3}
      >
        <HStack gap={3} minW={0} flex={1} align="center">
          <HStack gap={1.5} flexShrink={0}>
            <ServiceBadge type={issue.startBadgeKey} />
            <Text fontSize="sm" fontWeight="bold" color="text.primary">
              →
            </Text>
            <ServiceBadge type={issue.endBadgeKey} />
          </HStack>

          <Box minW={0}>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="text.primary"
              lineClamp={1}
            >
              {issue.name}
            </Text>
            <HStack gap={2} mt={0.5} color="text.secondary" flexWrap="wrap">
              <Text fontSize="xs">{issue.relativeUpdateLabel}</Text>
              <Box w="1px" h="10px" bg="text.secondary" flexShrink={0} />
              <Text fontSize="xs">{issue.buildProgressLabel}</Text>
            </HStack>
          </Box>
        </HStack>

        <IconButton
          aria-label={toggleButtonLabel}
          variant="ghost"
          size="sm"
          flexShrink={0}
          disabled={isTogglePending}
          onClick={handleToggleWorkflowClick}
        >
          {isTogglePending ? (
            <Spinner size="xs" />
          ) : isActive ? (
            <MdPause />
          ) : (
            <MdPlayArrow />
          )}
        </IconButton>
      </Flex>

      {isExpanded ? (
        <VStack align="stretch" gap={2} mt={4}>
          {issue.items.map((item) => (
            <HStack
              key={item.id}
              align="center"
              gap={4}
              p={3}
              border="1px solid"
              borderColor="border.default"
              borderRadius="4px"
            >
              <ServiceBadge type={item.badgeKey} />
              <Text fontSize="sm" color="text.primary" lineHeight="1.4">
                {item.message}
              </Text>
            </HStack>
          ))}
        </VStack>
      ) : null}
    </Box>
  );
};
