import {
  MdAccessTime,
  MdChecklist,
  MdFormatListBulleted,
} from "react-icons/md";

import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  DashboardErrorCard,
  DashboardMetricCard,
  ServiceConnectionCard,
} from "..";
import {
  type DashboardMetricId,
  useDashboardActions,
  useDashboardData,
} from "../../model";

const METRIC_ICONS = {
  "today-processed": MdChecklist,
  "total-processed": MdFormatListBulleted,
  "total-duration": MdAccessTime,
} as const;

type SectionHeaderProps = {
  title: string;
  description?: string;
};

const SectionHeader = ({ title, description }: SectionHeaderProps) => {
  return (
    <Box>
      <Heading fontSize="xl" fontWeight="semibold" color="text.primary">
        {title}
      </Heading>
      {description ? (
        <Text mt={1} fontSize="sm" color="text.secondary">
          {description}
        </Text>
      ) : null}
    </Box>
  );
};

type SectionStatusProps = {
  message: string;
  onRetry?: () => void;
};

const SectionStatus = ({ message, onRetry }: SectionStatusProps) => {
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
      direction={{ base: "column", md: "row" }}
    >
      <Text fontSize="sm" color="text.secondary">
        {message}
      </Text>
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          다시 시도
        </Button>
      ) : null}
    </Flex>
  );
};

const LoadingPanel = ({ message }: { message: string }) => {
  return (
    <HStack
      justify="center"
      gap={3}
      p={6}
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="10px"
      color="text.secondary"
    >
      <Spinner size="sm" />
      <Text fontSize="sm">{message}</Text>
    </HStack>
  );
};

export const DashboardSection = () => {
  const {
    metrics,
    issues,
    connectedServices,
    recommendedServices,
    isWorkflowsLoading,
    isWorkflowsError,
    isServicesLoading,
    isServicesError,
    handleReloadWorkflows,
    handleReloadServices,
  } = useDashboardData();
  const {
    expandedIssueId,
    getIssueIsActive,
    togglingWorkflowId,
    handleToggleIssue,
    handleToggleWorkflow,
  } = useDashboardActions();

  return (
    <VStack align="stretch" gap={12}>
      <VStack align="stretch" gap={6}>
        <SectionHeader
          title="자동화 가동 현황"
          description="내가 구축한 자동화 시스템 목록"
        />

        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
          {metrics.map((metric) => (
            <DashboardMetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              icon={METRIC_ICONS[metric.id as DashboardMetricId]}
            />
          ))}
        </SimpleGrid>
      </VStack>

      <VStack align="stretch" gap={6}>
        <SectionHeader
          title="오늘 발생한 에러"
          description="오늘 발생한 에러"
        />

        {isWorkflowsLoading ? (
          <LoadingPanel message="에러 자동화 목록을 불러오는 중입니다." />
        ) : null}

        {isWorkflowsError ? (
          <SectionStatus
            message="에러 자동화 목록을 불러오지 못했습니다."
            onRetry={handleReloadWorkflows}
          />
        ) : null}

        {!isWorkflowsLoading && !isWorkflowsError ? (
          issues.length > 0 ? (
            <VStack align="stretch" gap={3}>
              {issues.map((issue) => (
                <DashboardErrorCard
                  key={issue.id}
                  issue={issue}
                  isActive={getIssueIsActive(issue.id, issue.isActive)}
                  isExpanded={expandedIssueId === issue.id}
                  isTogglePending={togglingWorkflowId === issue.id}
                  onToggle={() => handleToggleIssue(issue.id)}
                  onToggleWorkflow={() =>
                    void handleToggleWorkflow(
                      issue.id,
                      getIssueIsActive(issue.id, issue.isActive),
                    )
                  }
                />
              ))}
            </VStack>
          ) : (
            <SectionStatus message="오늘 표시할 에러 자동화가 없습니다." />
          )
        ) : null}
      </VStack>

      <VStack align="stretch" gap={6}>
        <SectionHeader title="연결된 서비스" description="인증된 서비스 관리" />

        {isServicesLoading ? (
          <LoadingPanel message="연결된 서비스 목록을 불러오는 중입니다." />
        ) : null}

        {isServicesError ? (
          <SectionStatus
            message="연결된 서비스 목록을 불러오지 못했습니다."
            onRetry={handleReloadServices}
          />
        ) : null}

        {!isServicesLoading && !isServicesError ? (
          connectedServices.length > 0 ? (
            <Flex wrap="wrap" gap={6}>
              {connectedServices.map((service) => (
                <ServiceConnectionCard key={service.id} service={service} />
              ))}
            </Flex>
          ) : (
            <SectionStatus message="아직 연결된 서비스가 없습니다." />
          )
        ) : null}
      </VStack>

      <VStack align="stretch" gap={6}>
        <SectionHeader title="연결 추천 서비스" />

        {isServicesLoading ? (
          <LoadingPanel message="추천 서비스 목록을 준비하는 중입니다." />
        ) : null}

        {!isServicesLoading ? (
          recommendedServices.length > 0 ? (
            <Flex wrap="wrap" gap={6}>
              {recommendedServices.map((service) => (
                <ServiceConnectionCard key={service.id} service={service} />
              ))}
            </Flex>
          ) : (
            <SectionStatus message="지금은 추가로 추천할 서비스가 없습니다." />
          )
        ) : null}
      </VStack>
    </VStack>
  );
};
