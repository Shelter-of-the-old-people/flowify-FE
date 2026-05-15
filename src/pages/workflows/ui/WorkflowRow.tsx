import {
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import {
  MdDeleteOutline,
  MdErrorOutline,
  MdMoreHoriz,
  MdPlayArrow,
  MdStop,
} from "react-icons/md";

import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  Portal,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { type WorkflowResponse } from "@/entities/workflow";

import {
  type WorkflowListPrimaryActionKind,
  getBuildProgressLabel,
  getEndpointNodes,
  getRelativeUpdateLabel,
  getServiceBadgeKey,
  getWorkflowWarningMessages,
} from "../model";

import { ServiceBadge } from "./ServiceBadge";

type Props = {
  workflow: WorkflowResponse;
  triggerDisplayLabel: string;
  primaryActionKind: WorkflowListPrimaryActionKind;
  primaryActionLabel: string;
  isPrimaryActionPending: boolean;
  canUsePrimaryAction: boolean;
  canDelete: boolean;
  isDeletePending: boolean;
  onOpen: () => void;
  onPrimaryAction: () => void;
  onDelete: () => void;
};

const STOP_PRIMARY_ACTIONS: WorkflowListPrimaryActionKind[] = [
  "stop",
  "disable-auto-run",
  "disable-auto-run-and-stop",
];

export const WorkflowRow = ({
  workflow,
  triggerDisplayLabel,
  primaryActionKind,
  primaryActionLabel,
  isPrimaryActionPending,
  canUsePrimaryAction,
  canDelete,
  isDeletePending,
  onOpen,
  onPrimaryAction,
  onDelete,
}: Props) => {
  const { startNode, endNode } = getEndpointNodes(workflow);
  const startBadgeKey = getServiceBadgeKey(startNode);
  const endBadgeKey = getServiceBadgeKey(endNode);
  const relativeUpdate = getRelativeUpdateLabel(workflow.updatedAt);
  const buildProgress = getBuildProgressLabel(workflow);
  const warningMessages = getWorkflowWarningMessages(workflow);
  const isPrimaryActionDisabled =
    isDeletePending || isPrimaryActionPending || !canUsePrimaryAction;
  const primaryActionIcon = STOP_PRIMARY_ACTIONS.includes(primaryActionKind)
    ? MdStop
    : MdPlayArrow;

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

  const handleMenuEvent = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation();
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

        <HStack gap={2} flexShrink={0}>
          <Box
            maxW={{ base: "120px", md: "180px" }}
            px={3}
            py={1.5}
            bg="bg.overlay"
            border="1px solid"
            borderColor="border.default"
            borderRadius="999px"
          >
            <Text
              fontSize="11px"
              fontWeight="semibold"
              color="text.secondary"
              lineClamp={1}
            >
              {triggerDisplayLabel}
            </Text>
          </Box>

          <IconButton
            aria-label={primaryActionLabel}
            title={primaryActionLabel}
            variant="ghost"
            size="sm"
            disabled={isPrimaryActionDisabled}
            onClick={(event) => handleInnerAction(event, onPrimaryAction)}
          >
            {isPrimaryActionPending ? (
              <Spinner size="xs" />
            ) : (
              <Icon as={primaryActionIcon} boxSize={5} />
            )}
          </IconButton>
          <Menu.Root
            lazyMount
            unmountOnExit
            positioning={{ placement: "bottom-end" }}
          >
            <Menu.Trigger asChild>
              <IconButton
                type="button"
                aria-label="워크플로우 메뉴 열기"
                title="워크플로우 메뉴"
                variant="ghost"
                size="sm"
                onPointerDown={handleMenuEvent}
                onClick={handleMenuEvent}
                onKeyDown={handleMenuEvent}
              >
                <MdMoreHoriz />
              </IconButton>
            </Menu.Trigger>

            <Portal>
              <Menu.Positioner zIndex={20}>
                <Menu.Content
                  minW="148px"
                  p={1.5}
                  bg="bg.surface"
                  border="1px solid"
                  borderRadius="xl"
                  borderColor="border.default"
                  boxShadow="lg"
                  onPointerDown={handleMenuEvent}
                  onClick={handleMenuEvent}
                  onKeyDown={handleMenuEvent}
                >
                  <Menu.Item
                    value="delete"
                    color="status.error"
                    disabled={!canDelete || isDeletePending}
                    onSelect={onDelete}
                  >
                    <Icon as={MdDeleteOutline} boxSize={4} />
                    <Text as="span" fontSize="sm">
                      {isDeletePending ? "삭제 중..." : "삭제"}
                    </Text>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
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
