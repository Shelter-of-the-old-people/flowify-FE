import type { KeyboardEvent, MouseEvent } from "react";
import {
  MdErrorOutline,
  MdMoreHoriz,
  MdPause,
  MdPlayArrow,
} from "react-icons/md";

import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { type WorkflowResponse } from "@/shared";

import {
  getBuildProgressLabel,
  getEndpointNodes,
  getRelativeUpdateLabel,
  getServiceBadgeKey,
  getWorkflowWarningMessages,
} from "../model";

import { ServiceBadge } from "./ServiceBadge";

type Props = {
  workflow: WorkflowResponse;
  isTogglePending: boolean;
  onOpen: () => void;
  onToggle: () => void;
};

export const WorkflowRow = ({
  workflow,
  isTogglePending,
  onOpen,
  onToggle,
}: Props) => {
  const { startNode, endNode } = getEndpointNodes(workflow);
  const startBadgeKey = getServiceBadgeKey(startNode);
  const endBadgeKey = getServiceBadgeKey(endNode);
  const relativeUpdate = getRelativeUpdateLabel(workflow.updatedAt);
  const buildProgress = getBuildProgressLabel(workflow);
  const warningMessages = getWorkflowWarningMessages(workflow);
  const quickActionLabel = workflow.active ? "자동화 중지" : "자동화 실행";

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  const handleInnerAction = (
    event: MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    event.stopPropagation();
    action();
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
        borderRadius="xl"
        boxShadow="0 4px 12px rgba(15, 23, 42, 0.03)"
        cursor="pointer"
        transition="transform 180ms ease, box-shadow 180ms ease"
        _hover={{
          transform: "translateY(-1px)",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
        }}
        onClick={onOpen}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
      >
        <HStack gap={3} minW={0} flex={1}>
          <HStack gap={1.5} flexShrink={0}>
            <ServiceBadge type={startBadgeKey} />
            <Text fontSize="sm" fontWeight="bold" color="text.primary">
              →
            </Text>
            <ServiceBadge type={endBadgeKey} />
          </HStack>

          <Box minW={0}>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="text.primary"
              lineClamp={1}
            >
              {workflow.name}
            </Text>
            <HStack gap={2} mt={0.5} color="text.secondary">
              <Text fontSize="xs" lineClamp={1}>
                {relativeUpdate}
              </Text>
              <Box w="1px" h="10px" bg="text.secondary" flexShrink={0} />
              <Text fontSize="xs" lineClamp={1}>
                {buildProgress}
              </Text>
            </HStack>
          </Box>
        </HStack>

        <HStack gap={0} flexShrink={0}>
          <IconButton
            aria-label={quickActionLabel}
            variant="ghost"
            size="sm"
            disabled={isTogglePending}
            onClick={(event) => handleInnerAction(event, onToggle)}
          >
            {isTogglePending ? (
              <Spinner size="xs" />
            ) : workflow.active ? (
              <MdPause />
            ) : (
              <MdPlayArrow />
            )}
          </IconButton>
          <IconButton
            aria-label="자동화 상세 보기"
            variant="ghost"
            size="sm"
            onClick={(event) => handleInnerAction(event, onOpen)}
          >
            <MdMoreHoriz />
          </IconButton>
        </HStack>
      </Flex>

      {warningMessages.length > 0 ? (
        <Box
          maxH={0}
          opacity={0}
          overflow="hidden"
          transition="all 180ms ease"
          _groupHover={{
            maxH: "200px",
            opacity: 1,
          }}
        >
          <VStack
            mt={2}
            px={3}
            py={2.5}
            gap={1.5}
            align="stretch"
            bg="orange.50"
            border="1px solid"
            borderColor="orange.100"
            borderRadius="xl"
            color="orange.600"
            maxH="200px"
            overflowY="auto"
          >
            <HStack gap={2} align="center">
              <Icon as={MdErrorOutline} boxSize={4} flexShrink={0} />
              <Text fontSize="xs" fontWeight="semibold">
                구성 연결 경고
              </Text>
            </HStack>
            <VStack gap={1} align="stretch">
              {warningMessages.map((warningMessage, index) => (
                <Text
                  key={`${workflow.id}-warning-${index}`}
                  pl={6}
                  fontSize="xs"
                  fontWeight="medium"
                  lineHeight="1.45"
                >
                  {warningMessage}
                </Text>
              ))}
            </VStack>
          </VStack>
        </Box>
      ) : null}
    </Box>
  );
};
