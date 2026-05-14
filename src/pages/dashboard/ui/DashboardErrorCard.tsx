import { type KeyboardEvent, type MouseEvent, useId } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";

import { Box, Flex, HStack, IconButton, Text, VStack } from "@chakra-ui/react";

import { getNodeStatusMissingFieldLabel } from "@/entities/workflow";
import { ServiceBadge, type ServiceBadgeKey } from "@/shared";

import { type DashboardIssue } from "../model";

type Props = {
  issue: DashboardIssue;
  isExpanded: boolean;
  canOpenWorkflow: boolean;
  workflowMissingFieldLabels: string[];
  missingFieldLabelsByBadgeKey: Partial<Record<ServiceBadgeKey, string[]>>;
  onOpenWorkflow: () => void;
  onToggle: () => void;
};

const LATIN_TEXT_PATTERN = /[A-Za-z]/;
const KOREAN_TEXT_PATTERN = /[가-힣]/;
const EMPTY_ERROR_DETAIL_MESSAGE = "에러 메시지가 비어 있습니다.";

const DASHBOARD_ISSUE_SERVICE_LABELS: Record<ServiceBadgeKey, string> = {
  calendar: "Google Calendar",
  "canvas-lms": "Canvas LMS",
  discord: "Discord",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  "google-sheets": "Google Sheets",
  github: "GitHub",
  "naver-news": "Naver News",
  notion: "Notion",
  seboard: "SE Board",
  slack: "Slack",
  communication: "커뮤니케이션 서비스",
  storage: "저장소 서비스",
  spreadsheet: "스프레드시트 서비스",
  "web-scraping": "웹 수집 서비스",
  notification: "알림 서비스",
  llm: "AI 서비스",
  trigger: "트리거",
  processing: "처리 노드",
  unknown: "워크플로우",
};

const DASHBOARD_ISSUE_SERVICE_PATTERNS: Array<[RegExp, string]> = [
  [/\bgmail\b/, "Gmail"],
  [/\bslack\b/, "Slack"],
  [/\bnotion\b/, "Notion"],
  [/\bgithub\b/, "GitHub"],
  [/\bdiscord\b/, "Discord"],
  [/\bcanvas(?:[-_\s]?lms)?\b/, "Canvas LMS"],
  [/\bgoogle[-_\s]?drive\b/, "Google Drive"],
  [/\bgoogle[-_\s]?sheets?\b/, "Google Sheets"],
  [/\bgoogle[-_\s]?calendar\b|\bcalendar\b/, "Google Calendar"],
  [/\bnaver(?:[-_\s]?news)?\b/, "Naver News"],
  [/\bseboard\b|\bse[-_\s]?board\b/, "SE Board"],
];

const DASHBOARD_ISSUE_REQUIRED_FIELD_PATTERNS: Array<[RegExp, string]> = [
  [
    /\bconfig[._-]?recipient\b|\brecipients?\b|\brecipient_list\b|\bto\b/,
    "recipient",
  ],
  [/\bconfig[._-]?subject\b|\bsubjects?\b|\btitle\b/, "subject"],
  [
    /\bconfig[._-]?action\b|\bchoice_action_id\b|\bwrite_mode\b|\baction\b/,
    "action",
  ],
  [/\bconfig[._-]?message\b|\bmessage_template\b|\bbody\b/, "messageTemplate"],
  [/\bconfig[._-]?channel\b|\bchannel\b/, "channel"],
  [/\bconfig[._-]?target\b|\btarget\b|\btarget_id\b/, "target"],
  [/\bconfig[._-]?prompt\b|\bprompt\b/, "prompt"],
  [/\bspreadsheet_id\b|\bspreadsheetid\b/, "spreadsheet_id"],
  [/\bsheet_name\b|\bsheetname\b/, "sheet_name"],
  [/\bcalendar_id\b|\bcalendarid\b/, "calendar_id"],
  [/\bwebhook_url\b|\bwebhook\b/, "webhook_url"],
];

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.includes(keyword));

const getDashboardIssueServiceLabel = (
  normalizedMessage: string,
  badgeKey: ServiceBadgeKey,
) => {
  const matchedService = DASHBOARD_ISSUE_SERVICE_PATTERNS.find(([pattern]) =>
    pattern.test(normalizedMessage),
  );

  return matchedService?.[1] ?? DASHBOARD_ISSUE_SERVICE_LABELS[badgeKey];
};

const getDashboardIssueRequiredFieldLabels = (normalizedMessage: string) => {
  const labels = DASHBOARD_ISSUE_REQUIRED_FIELD_PATTERNS.filter(([pattern]) =>
    pattern.test(normalizedMessage),
  ).map(([, field]) => getNodeStatusMissingFieldLabel(field));

  return Array.from(new Set(labels));
};

const mergeFieldLabels = (
  ...labelGroups: Array<readonly string[] | undefined>
) => Array.from(new Set(labelGroups.flatMap((labels) => labels ?? [])));

const getLocalizedDashboardIssueMessage = (
  message: string,
  badgeKey: ServiceBadgeKey,
  missingFieldLabels?: readonly string[],
) => {
  const trimmedMessage = message.trim();

  if (trimmedMessage.length === 0) {
    return EMPTY_ERROR_DETAIL_MESSAGE;
  }

  const messageCode = trimmedMessage.toUpperCase();
  const normalizedMessage = trimmedMessage.toLowerCase();
  const serviceLabel = getDashboardIssueServiceLabel(
    normalizedMessage,
    badgeKey,
  );

  if (messageCode === "EXECUTION_FAILED") {
    return "워크플로우 실행 중 오류가 발생했습니다.";
  }

  if (messageCode === "WORKFLOW_NOT_EXECUTABLE") {
    return "워크플로우 실행에 필요한 설정을 확인해 주세요.";
  }

  if (
    includesAny(normalizedMessage, [
      "auth",
      "oauth",
      "token",
      "credential",
      "unauthorized",
      "forbidden",
      "permission",
      "access denied",
    ])
  ) {
    return `${serviceLabel} 인증 또는 권한 확인이 필요합니다.`;
  }

  if (
    includesAny(normalizedMessage, [
      "not executable",
      "config",
      "configuration",
      "validation",
      "invalid",
      "missing",
      "required",
      "bad request",
    ])
  ) {
    const requiredFieldLabels = mergeFieldLabels(
      missingFieldLabels,
      getDashboardIssueRequiredFieldLabels(normalizedMessage),
    );

    if (requiredFieldLabels.length > 0) {
      return `${serviceLabel} 필수 설정이 필요합니다. 확인할 항목: ${requiredFieldLabels.join(", ")}`;
    }

    return `${serviceLabel} 노드 설정값을 확인해 주세요.`;
  }

  if (includesAny(normalizedMessage, ["rate limit", "quota", "too many"])) {
    return `${serviceLabel} 요청 한도 초과로 실행에 실패했습니다.`;
  }

  if (includesAny(normalizedMessage, ["timeout", "timed out"])) {
    return `${serviceLabel} 응답 시간이 초과되어 실행에 실패했습니다.`;
  }

  if (includesAny(normalizedMessage, ["not found", "404"])) {
    return `${serviceLabel}에서 필요한 대상을 찾지 못했습니다.`;
  }

  if (includesAny(normalizedMessage, ["parse", "json", "format"])) {
    return `${serviceLabel} 응답 형식을 처리하지 못했습니다.`;
  }

  if (
    includesAny(normalizedMessage, [
      "fetch",
      "load",
      "read",
      "get ",
      "list",
      "retrieve",
      "message",
    ])
  ) {
    return `${serviceLabel} 데이터를 가져오는 중 오류가 발생했습니다.`;
  }

  if (
    includesAny(normalizedMessage, [
      "send",
      "post",
      "create",
      "upload",
      "write",
      "publish",
    ])
  ) {
    return `${serviceLabel}로 데이터를 보내는 중 오류가 발생했습니다.`;
  }

  if (includesAny(normalizedMessage, ["network", "connect", "request"])) {
    return `${serviceLabel} 연결 요청 중 오류가 발생했습니다.`;
  }

  if (
    includesAny(normalizedMessage, [
      "node execution failed",
      "execution failed",
      "failed",
      "error",
      "exception",
    ])
  ) {
    return `${serviceLabel} 노드 실행 중 오류가 발생했습니다.`;
  }

  if (KOREAN_TEXT_PATTERN.test(trimmedMessage)) {
    return trimmedMessage;
  }

  if (LATIN_TEXT_PATTERN.test(trimmedMessage)) {
    return `${serviceLabel} 처리 중 오류가 발생했습니다.`;
  }

  return trimmedMessage;
};

export const DashboardErrorCard = ({
  issue,
  isExpanded,
  canOpenWorkflow,
  workflowMissingFieldLabels,
  missingFieldLabelsByBadgeKey,
  onOpenWorkflow,
  onToggle,
}: Props) => {
  const detailsId = useId();
  const hasIssueItems = issue.items.length > 0;
  const localizedBuildProgressLabel = getLocalizedDashboardIssueMessage(
    issue.buildProgressLabel,
    issue.startBadgeKey,
    workflowMissingFieldLabels,
  );

  const handleCardClick = () => {
    if (!canOpenWorkflow) {
      return;
    }

    onOpenWorkflow();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenWorkflow || event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenWorkflow();
    }
  };

  const handleToggleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };

  return (
    <Box
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="10px"
      boxShadow="0 0 4px rgba(239, 61, 61, 0.24)"
      cursor={canOpenWorkflow ? "pointer" : "default"}
      p={4}
      role={canOpenWorkflow ? "button" : undefined}
      tabIndex={canOpenWorkflow ? 0 : undefined}
      aria-disabled={!canOpenWorkflow}
      aria-label={`${issue.name} 워크플로우 편집 화면 열기`}
      title={canOpenWorkflow ? undefined : "연결된 워크플로우 정보가 없습니다."}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      _focusVisible={{
        outline: "2px solid",
        outlineColor: "neutral.950",
        outlineOffset: "2px",
      }}
    >
      <Flex align="center" justify="space-between" gap={3}>
        <Flex
          alignItems="center"
          justifyContent="flex-start"
          gap={3}
          minW={0}
          flex={1}
          w="full"
          overflow="hidden"
        >
          <HStack gap={1.5} flexShrink={0}>
            <ServiceBadge type={issue.startBadgeKey} />
            <Text fontSize="sm" fontWeight="bold" color="text.primary">
              →
            </Text>
            <ServiceBadge type={issue.endBadgeKey} />
          </HStack>

          <Box minW={0} flex={1}>
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
              <Text
                fontSize="xs"
                title={
                  localizedBuildProgressLabel === issue.buildProgressLabel
                    ? undefined
                    : issue.buildProgressLabel
                }
              >
                {localizedBuildProgressLabel}
              </Text>
            </HStack>
          </Box>
        </Flex>

        <HStack gap={1} flexWrap="nowrap" flexShrink={0} alignSelf="center">
          <IconButton
            aria-label={isExpanded ? "에러 상세 접기" : "에러 상세 펼치기"}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            variant="ghost"
            size="sm"
            flexShrink={0}
            onClick={handleToggleClick}
          >
            {isExpanded ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
          </IconButton>
        </HStack>
      </Flex>

      {isExpanded ? (
        <VStack id={detailsId} align="stretch" gap={2} mt={4}>
          {hasIssueItems ? (
            issue.items.map((item) => {
              const localizedMessage = getLocalizedDashboardIssueMessage(
                item.message,
                item.badgeKey,
                missingFieldLabelsByBadgeKey[item.badgeKey],
              );

              return (
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
                  <Text
                    fontSize="sm"
                    color="text.primary"
                    lineHeight="1.4"
                    title={
                      localizedMessage === item.message
                        ? undefined
                        : item.message
                    }
                  >
                    {localizedMessage}
                  </Text>
                </HStack>
              );
            })
          ) : (
            <Text fontSize="sm" color="text.secondary">
              표시할 상세 에러 내역이 없습니다.
            </Text>
          )}
        </VStack>
      ) : null}
    </Box>
  );
};
