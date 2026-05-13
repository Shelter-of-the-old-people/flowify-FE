import {
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import {
  MdErrorOutline,
  MdMoreHoriz,
  MdOpenInNew,
  MdPlayArrow,
  MdStop,
} from "react-icons/md";

import {
  Box,
  Button,
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
  type WorkflowAutoRunState,
  getBuildProgressLabel,
  getEndpointNodes,
  getRelativeUpdateLabel,
  getServiceBadgeKey,
  getWorkflowWarningMessages,
} from "../model";

import { ServiceBadge } from "./ServiceBadge";

type Props = {
  workflow: WorkflowResponse;
  autoRunKind: WorkflowAutoRunState["kind"];
  autoRunLabel: string;
  isAutoRunToggleable: boolean;
  isAutoRunPending: boolean;
  executionActionKind: "run" | "stop";
  executionActionLabel: string;
  isExecutionActionPending: boolean;
  onOpen: () => void;
  onAutoRunToggle: () => void;
  onExecutionAction: () => void;
};

const AUTO_RUN_BUTTON_STYLES: Record<
  WorkflowAutoRunState["kind"],
  {
    bg: string;
    color: string;
    border: string;
    hoverBg: string;
  }
> = {
  manual: {
    bg: "#f8f8f8",
    color: "#5b5b5b",
    border: "1px solid #d8d8d8",
    hoverBg: "#f3f3f3",
  },
  enabled: {
    bg: "#272727",
    color: "#f7f7f7",
    border: "1px solid #272727",
    hoverBg: "#333333",
  },
  disabled: {
    bg: "#f5f5f5",
    color: "#5b5b5b",
    border: "1px solid #d8d8d8",
    hoverBg: "#efefef",
  },
};

export const WorkflowRow = ({
  workflow,
  autoRunKind,
  autoRunLabel,
  isAutoRunToggleable,
  isAutoRunPending,
  executionActionKind,
  executionActionLabel,
  isExecutionActionPending,
  onOpen,
  onAutoRunToggle,
  onExecutionAction,
}: Props) => {
  const { startNode, endNode } = getEndpointNodes(workflow);
  const startBadgeKey = getServiceBadgeKey(startNode);
  const endBadgeKey = getServiceBadgeKey(endNode);
  const relativeUpdate = getRelativeUpdateLabel(workflow.updatedAt);
  const buildProgress = getBuildProgressLabel(workflow);
  const warningMessages = getWorkflowWarningMessages(workflow);
  const autoRunButtonStyle = AUTO_RUN_BUTTON_STYLES[autoRunKind];
  const shouldShowAutoRunButton = autoRunKind !== "manual";

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
          {shouldShowAutoRunButton ? (
            <Button
              type="button"
              size="xs"
              minW="auto"
              px={3}
              py={1.5}
              borderRadius="999px"
              fontSize="11px"
              fontWeight="semibold"
              bg={autoRunButtonStyle.bg}
              color={autoRunButtonStyle.color}
              border={autoRunButtonStyle.border}
              opacity={isAutoRunToggleable || isAutoRunPending ? 1 : 0.72}
              cursor={
                isAutoRunToggleable && !isAutoRunPending ? "pointer" : "default"
              }
              _hover={{
                bg:
                  isAutoRunToggleable && !isAutoRunPending
                    ? autoRunButtonStyle.hoverBg
                    : autoRunButtonStyle.bg,
              }}
              _active={{
                bg: autoRunButtonStyle.hoverBg,
              }}
              onClick={(event) => handleInnerAction(event, onAutoRunToggle)}
            >
              {isAutoRunPending ? <Spinner size="xs" /> : autoRunLabel}
            </Button>
          ) : null}

          <IconButton
            aria-label={executionActionLabel}
            variant="ghost"
            size="sm"
            disabled={isExecutionActionPending}
            onClick={(event) => handleInnerAction(event, onExecutionAction)}
          >
            {isExecutionActionPending ? (
              <Spinner size="xs" />
            ) : executionActionKind === "stop" ? (
              <MdStop />
            ) : (
              <MdPlayArrow />
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
                  <Menu.Item value="open" onSelect={onOpen}>
                    <Icon as={MdOpenInNew} boxSize={4} />
                    <Text as="span" fontSize="sm">
                      워크플로우 열기
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
