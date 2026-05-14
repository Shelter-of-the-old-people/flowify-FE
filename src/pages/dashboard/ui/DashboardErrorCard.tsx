import { type MouseEvent, useId } from "react";
import { MdKeyboardArrowDown, MdKeyboardArrowUp } from "react-icons/md";

import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";

import { ServiceBadge } from "@/shared";

import { type DashboardIssue } from "../model";

type Props = {
  issue: DashboardIssue;
  isExpanded: boolean;
  canOpenWorkflow: boolean;
  onOpenWorkflow: () => void;
  onToggle: () => void;
};

export const DashboardErrorCard = ({
  issue,
  isExpanded,
  canOpenWorkflow,
  onOpenWorkflow,
  onToggle,
}: Props) => {
  const detailsId = useId();
  const hasIssueItems = issue.items.length > 0;

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
      p={4}
    >
      <Flex align="center" justify="space-between" gap={3}>
        <Button
          type="button"
          variant="ghost"
          alignItems="center"
          justifyContent="flex-start"
          gap={3}
          minW={0}
          flex={1}
          w="full"
          h="auto"
          p={0}
          overflow="hidden"
          bg="transparent"
          borderRadius="8px"
          color="inherit"
          textAlign="left"
          cursor={canOpenWorkflow ? "pointer" : "default"}
          disabled={!canOpenWorkflow}
          aria-disabled={!canOpenWorkflow}
          aria-label={`${issue.name} 워크플로우 편집 화면 열기`}
          title={
            canOpenWorkflow ? undefined : "연결된 워크플로우 정보가 없습니다."
          }
          onClick={onOpenWorkflow}
          _hover={canOpenWorkflow ? { bg: "bg.muted" } : undefined}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: "neutral.950",
            outlineOffset: "2px",
          }}
          _disabled={{
            cursor: "default",
            opacity: 1,
          }}
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
              <Text fontSize="xs">{issue.buildProgressLabel}</Text>
            </HStack>
          </Box>
        </Button>

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
            issue.items.map((item) => (
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
            ))
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
