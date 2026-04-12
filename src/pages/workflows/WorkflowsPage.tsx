import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { IconType } from "react-icons";
import {
  MdAdd,
  MdAutoAwesome,
  MdBolt,
  MdCalendarMonth,
  MdEmail,
  MdErrorOutline,
  MdFolder,
  MdLanguage,
  MdMoreHoriz,
  MdNotifications,
  MdPause,
  MdPlayArrow,
  MdSettings,
  MdTableChart,
} from "react-icons/md";
import { useNavigate } from "react-router";

import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useCreateWorkflowShortcut } from "@/features/create-workflow";
import type { NodeDefinitionResponse, WorkflowResponse } from "@/shared";
import {
  buildPath,
  useInfiniteWorkflowListQuery,
  useToggleWorkflowActiveMutation,
} from "@/shared";

const WORKFLOW_FILTERS = [
  { key: "all", label: "전체" },
  { key: "active", label: "실행" },
  { key: "inactive", label: "중지됨" },
] as const;

type WorkflowFilterKey = (typeof WORKFLOW_FILTERS)[number]["key"];

type ServiceBadgeKey =
  | "calendar"
  | "gmail"
  | "google-drive"
  | "google-sheets"
  | "notion"
  | "slack"
  | "communication"
  | "storage"
  | "spreadsheet"
  | "web-scraping"
  | "notification"
  | "llm"
  | "trigger"
  | "processing"
  | "unknown";

const FALLBACK_NODE_ICONS: Record<ServiceBadgeKey, IconType> = {
  calendar: MdCalendarMonth,
  gmail: MdEmail,
  "google-drive": MdFolder,
  "google-sheets": MdTableChart,
  notion: MdFolder,
  slack: MdNotifications,
  communication: MdEmail,
  storage: MdFolder,
  spreadsheet: MdTableChart,
  "web-scraping": MdLanguage,
  notification: MdNotifications,
  llm: MdAutoAwesome,
  trigger: MdBolt,
  processing: MdSettings,
  unknown: MdSettings,
};

const getRelativeUpdateLabel = (updatedAt: string) => {
  const updatedTime = getUpdatedTimestamp(updatedAt);
  if (updatedTime === 0) {
    return "방금 전 변경됨";
  }

  const diffMs = Math.max(0, Date.now() - updatedTime);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < minuteMs) {
    return "방금 전 변경됨";
  }

  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}분 전 변경됨`;
  }

  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)}시간 전 변경됨`;
  }

  if (diffMs < weekMs) {
    return `${Math.floor(diffMs / dayMs)}일 전 변경됨`;
  }

  return `${Math.floor(diffMs / weekMs)}주 전 변경됨`;
};

const getUpdatedTimestamp = (updatedAt: string) => {
  const updatedTime = new Date(updatedAt).getTime();
  return Number.isNaN(updatedTime) ? 0 : updatedTime;
};

const getBuildProgressLabel = (workflow: WorkflowResponse) => {
  const totalNodes = workflow.nodes.length;
  const configuredNodes = workflow.nodes.filter((node) => {
    const isConfigured = node.config?.["isConfigured"];
    return isConfigured === true;
  }).length;

  return `${configuredNodes}/${totalNodes} 구축`;
};

const getWorkflowWarningMessages = (workflow: WorkflowResponse) =>
  workflow.warnings?.map((warning) => warning.message).filter(Boolean) ?? [];

const getEndpointNodes = (workflow: WorkflowResponse) => {
  const startNode =
    workflow.nodes.find((node) => node.role === "start") ??
    workflow.nodes[0] ??
    null;
  const endNode =
    workflow.nodes.find((node) => node.role === "end") ??
    workflow.nodes.at(-1) ??
    startNode;

  return { startNode, endNode };
};

const getServiceBadgeKey = (
  node: NodeDefinitionResponse | null,
): ServiceBadgeKey => {
  if (!node) {
    return "unknown";
  }

  const service = node.config?.["service"];
  if (typeof service === "string") {
    switch (service) {
      case "google-calendar":
        return "calendar";
      case "gmail":
        return "gmail";
      case "google-drive":
        return "google-drive";
      case "google-sheets":
        return "google-sheets";
      case "notion":
        return "notion";
      case "slack":
        return "slack";
      default:
        break;
    }
  }

  switch (node.type) {
    case "calendar":
      return "calendar";
    case "communication":
      return "communication";
    case "storage":
      return "storage";
    case "spreadsheet":
      return "spreadsheet";
    case "web-scraping":
      return "web-scraping";
    case "notification":
      return "notification";
    case "llm":
      return "llm";
    case "trigger":
      return "trigger";
    case "data-process":
    case "condition":
    case "loop":
    case "filter":
    case "multi-output":
    case "output-format":
    case "early-exit":
      return "processing";
    default:
      return "unknown";
  }
};

const ServiceBadge = ({ type }: { type: ServiceBadgeKey }) => {
  const fallbackIcon = FALLBACK_NODE_ICONS[type];

  const content = (() => {
    switch (type) {
      case "calendar":
        return (
          <Box
            w="30px"
            h="30px"
            bg="white"
            borderRadius="8px"
            border="1px solid"
            borderColor="#D6E3FF"
            overflow="hidden"
            boxShadow="0 6px 12px rgba(66, 133, 244, 0.10)"
          >
            <Box h="8px" bg="#4285F4" />
            <Flex h="22px" align="center" justify="center">
              <Text fontSize="10px" fontWeight="black" color="#4285F4">
                31
              </Text>
            </Flex>
          </Box>
        );
      case "notion":
        return (
          <Flex
            w="30px"
            h="30px"
            align="center"
            justify="center"
            bg="white"
            borderRadius="8px"
            border="2px solid"
            borderColor="black"
            boxShadow="0 6px 12px rgba(15, 23, 42, 0.08)"
          >
            <Text fontSize="15px" fontWeight="black" color="black">
              N
            </Text>
          </Flex>
        );
      case "google-drive":
        return (
          <svg aria-hidden="true" height="30" viewBox="0 0 30 30" width="30">
            <polygon
              fill="#0F9D58"
              points="10,4 15.4,13.2 10.6,21.6 5.2,12.4"
            />
            <polygon
              fill="#FFC107"
              points="10.6,21.6 15.4,13.2 25,13.2 20.2,21.6"
            />
            <polygon fill="#4285F4" points="15.4,13.2 10,4 19.6,4 25,13.2" />
          </svg>
        );
      case "gmail":
        return (
          <svg aria-hidden="true" height="30" viewBox="0 0 30 30" width="30">
            <rect fill="white" height="20" rx="5" width="24" x="3" y="5" />
            <path
              d="M6 22V10.5L15 17L24 10.5V22"
              fill="none"
              stroke="#EA4335"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="M6 10.5L9.8 13.4V22"
              fill="none"
              stroke="#4285F4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="M24 10.5L20.2 13.4V22"
              fill="none"
              stroke="#34A853"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="M15 17L24 10.5"
              fill="none"
              stroke="#FBBC04"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
        );
      case "google-sheets":
        return (
          <svg aria-hidden="true" height="30" viewBox="0 0 30 30" width="30">
            <path
              d="M8 4.5h10l4 4v17H8z"
              fill="#34A853"
              stroke="#2B8E46"
              strokeWidth="1"
            />
            <path d="M18 4.5v4h4" fill="#7BD88F" />
            <path
              d="M11 13h8M11 17h8M15 9v12"
              stroke="white"
              strokeWidth="1.8"
            />
          </svg>
        );
      case "slack":
        return (
          <svg aria-hidden="true" height="30" viewBox="0 0 30 30" width="30">
            <rect fill="#36C5F0" height="10" rx="5" width="6" x="6" y="3" />
            <rect fill="#2EB67D" height="6" rx="3" width="10" x="9" y="6" />
            <rect fill="#E01E5A" height="10" rx="5" width="6" x="18" y="9" />
            <rect fill="#ECB22E" height="6" rx="3" width="10" x="11" y="18" />
            <rect fill="#2EB67D" height="10" rx="5" width="6" x="9" y="18" />
            <rect fill="#E01E5A" height="6" rx="3" width="10" x="6" y="11" />
          </svg>
        );
      default:
        return (
          <Flex
            w="30px"
            h="30px"
            align="center"
            justify="center"
            bg="gray.50"
            borderRadius="8px"
            border="1px solid"
            borderColor="border.default"
          >
            <Icon as={fallbackIcon} boxSize={4.5} color="text.primary" />
          </Flex>
        );
    }
  })();

  return (
    <Flex w="38px" h="38px" align="center" justify="center" flexShrink={0}>
      {content}
    </Flex>
  );
};

const WorkflowFilterTabs = ({
  activeFilter,
  onChange,
}: {
  activeFilter: WorkflowFilterKey;
  onChange: (filter: WorkflowFilterKey) => void;
}) => (
  <HStack gap={6} px={2} py={3}>
    {WORKFLOW_FILTERS.map((filter) => {
      const isActive = filter.key === activeFilter;

      return (
        <Box
          key={filter.key}
          as="button"
          type="button"
          py={0.5}
          fontSize="14px"
          fontWeight="regular"
          color="text.primary"
          borderBottom="1px solid"
          borderColor={isActive ? "black" : "transparent"}
          transition="border-color 160ms ease"
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </Box>
      );
    })}
  </HStack>
);

const WorkflowRow = ({
  workflow,
  isTogglePending,
  onOpen,
  onToggle,
}: {
  workflow: WorkflowResponse;
  isTogglePending: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) => {
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
        bg="white"
        border="1px solid"
        borderColor="#F2F2F2"
        borderRadius="10px"
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
            <Text fontSize="14px" fontWeight="black" color="text.primary">
              →
            </Text>
            <ServiceBadge type={endBadgeKey} />
          </HStack>

          <Box minW={0}>
            <Text
              fontSize="14px"
              fontWeight="medium"
              color="text.primary"
              lineClamp={1}
            >
              {workflow.name}
            </Text>
            <HStack gap={2} mt={0.5} color="text.secondary">
              <Text fontSize="12px" lineClamp={1}>
                {relativeUpdate}
              </Text>
              <Box w="1px" h="10px" bg="#5C5C5C" flexShrink={0} />
              <Text fontSize="12px" lineClamp={1}>
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
            bg="#FFF7ED"
            border="1px solid"
            borderColor="#FDBA74"
            borderRadius="10px"
            color="#9A3412"
            maxH="200px"
            overflowY="auto"
          >
            <HStack gap={2} align="center">
              <Icon as={MdErrorOutline} boxSize={4} flexShrink={0} />
              <Text fontSize="12px" fontWeight="semibold">
                구성 연결 경고
              </Text>
            </HStack>
            <VStack gap={1} align="stretch">
              {warningMessages.map((warningMessage, index) => (
                <Text
                  key={`${workflow.id}-warning-${index}`}
                  pl={6}
                  fontSize="12px"
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

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<WorkflowFilterKey>("all");
  const [togglingWorkflowId, setTogglingWorkflowId] = useState<string | null>(
    null,
  );
  const { createWorkflow, isPending: isCreatePending } =
    useCreateWorkflowShortcut();
  const { mutateAsync: toggleWorkflowActive } =
    useToggleWorkflowActiveMutation();
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteWorkflowListQuery(20);

  const workflows = useMemo(
    () =>
      [...(data?.pages.flatMap((page) => page.content) ?? [])].sort(
        (leftWorkflow, rightWorkflow) =>
          getUpdatedTimestamp(rightWorkflow.updatedAt) -
          getUpdatedTimestamp(leftWorkflow.updatedAt),
      ),
    [data],
  );

  const filteredWorkflows = useMemo(() => {
    switch (activeFilter) {
      case "active":
        return workflows.filter((workflow) => workflow.active);
      case "inactive":
        return workflows.filter((workflow) => !workflow.active);
      case "all":
      default:
        return workflows;
    }
  }, [activeFilter, workflows]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      {
        rootMargin: "240px 0px",
        threshold: 0,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleCreateWorkflow = () => {
    void createWorkflow();
  };

  const handleOpenWorkflow = (workflowId: string) => {
    navigate(buildPath.workflowEditor(workflowId));
  };

  const handleToggleWorkflow = async (workflow: WorkflowResponse) => {
    setTogglingWorkflowId(workflow.id);

    try {
      await toggleWorkflowActive({
        workflowId: workflow.id,
        active: !workflow.active,
      });
    } finally {
      setTogglingWorkflowId(null);
    }
  };

  return (
    <Box maxW="1180px" mx="auto" w="100%">
      <VStack align="stretch" gap={6}>
        <Flex align="center" justify="space-between" gap={6} wrap="wrap">
          <Box>
            <Text fontSize="20px" fontWeight="semibold" color="text.primary">
              내 자동화 목록
            </Text>
            <Text mt={1} fontSize="14px" color="#5C5C5C">
              내가 구축한 자동화 시스템 목록
            </Text>
          </Box>

          <Button
            bg="black"
            color="white"
            px={3}
            py={1.5}
            h="auto"
            borderRadius="10px"
            fontSize="14px"
            fontWeight="semibold"
            display="inline-flex"
            alignItems="center"
            gap={2}
            disabled={isCreatePending}
            _hover={{ bg: "#191919" }}
            onClick={handleCreateWorkflow}
          >
            <Icon as={MdAdd} boxSize={3} />
            {isCreatePending
              ? "자동화 시스템 생성 중..."
              : "자동화 시스템 만들기"}
          </Button>
        </Flex>

        <Box>
          <WorkflowFilterTabs
            activeFilter={activeFilter}
            onChange={setActiveFilter}
          />

          {isLoading ? (
            <VStack py={16} gap={4} color="text.secondary">
              <Spinner size="lg" />
              <Text>자동화 목록을 불러오는 중입니다.</Text>
            </VStack>
          ) : null}

          {isError ? (
            <VStack py={16} gap={4} color="text.secondary">
              <Text>자동화 목록을 불러오지 못했습니다.</Text>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                다시 시도
              </Button>
            </VStack>
          ) : null}

          {!isLoading && !isError ? (
            <VStack align="stretch" gap={3}>
              {filteredWorkflows.map((workflow) => (
                <WorkflowRow
                  key={workflow.id}
                  workflow={workflow}
                  isTogglePending={togglingWorkflowId === workflow.id}
                  onOpen={() => handleOpenWorkflow(workflow.id)}
                  onToggle={() => void handleToggleWorkflow(workflow)}
                />
              ))}

              {hasNextPage ? <Box ref={loadMoreRef} h="1px" /> : null}

              {isFetchingNextPage ? (
                <HStack justify="center" py={4} color="text.secondary">
                  <Spinner size="sm" />
                  <Text fontSize="13px">
                    다음 자동화 목록을 불러오는 중입니다.
                  </Text>
                </HStack>
              ) : null}

              {filteredWorkflows.length === 0 ? (
                <Box
                  p={6}
                  bg="white"
                  border="1px dashed"
                  borderColor="border.default"
                  borderRadius="16px"
                >
                  <Text
                    fontSize="14px"
                    fontWeight="medium"
                    color="text.primary"
                  >
                    {workflows.length === 0
                      ? "아직 구축한 자동화가 없습니다."
                      : "선택한 상태의 자동화가 없습니다."}
                  </Text>
                  <Text mt={2} fontSize="13px" color="text.secondary">
                    첫 자동화를 만들고 워크플로우 편집기로 바로 이동해보세요.
                  </Text>
                  {workflows.length === 0 ? (
                    <Button
                      mt={4}
                      size="sm"
                      bg="black"
                      color="white"
                      disabled={isCreatePending}
                      _hover={{ bg: "#191919" }}
                      onClick={handleCreateWorkflow}
                    >
                      자동화 시스템 만들기
                    </Button>
                  ) : null}
                </Box>
              ) : null}
            </VStack>
          ) : null}
        </Box>
      </VStack>
    </Box>
  );
}
