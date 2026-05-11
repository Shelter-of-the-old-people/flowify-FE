import { MdKeyboardArrowDown, MdPause, MdPlayArrow } from "react-icons/md";

import { Box, Button, Icon, Menu, Portal, Spinner } from "@chakra-ui/react";

type RunStopSplitButtonProps = {
  isRunning: boolean;
  isRunPending: boolean;
  isStopPending: boolean;
  canRun: boolean;
  canStop: boolean;
  canOpenMenu: boolean;
  onRun: () => void;
  onStop: () => void;
  onOpenTriggerSettings: () => void;
  onCheckBeforeRun: () => void;
};

/**
 * Figma 1878:3330 기준 오른쪽 스플릿 버튼.
 *
 * 왼쪽 파트(실행/중지 토글) + 구분선 + 오른쪽 메뉴 파트.
 * 스펙 §4.2: 실행 중에는 라벨이 "중지"로 토글되고 중지 API를 호출한다.
 */
export const RunStopSplitButton = ({
  isRunning,
  isRunPending,
  isStopPending,
  canRun,
  canStop,
  canOpenMenu,
  onRun,
  onStop,
  onOpenTriggerSettings,
  onCheckBeforeRun,
}: RunStopSplitButtonProps) => {
  const runSideDisabled = isRunning
    ? !canStop || isStopPending
    : !canRun || isRunPending;
  const runSideLoading = isRunning ? isStopPending : isRunPending;
  const runSideLabel = isRunning ? "중지" : "실행하기";
  const runSideIcon = isRunning ? MdPause : MdPlayArrow;
  const handleRunSideClick = isRunning ? onStop : onRun;

  return (
    <Box display="flex" height="32px" alignItems="center" flexShrink={0}>
      <Button
        type="button"
        onClick={handleRunSideClick}
        disabled={runSideDisabled}
        height="100%"
        minWidth="auto"
        px={{ base: 2, xl: 3 }}
        py={0}
        bg="neutral.900"
        color="text.inverse"
        borderTopLeftRadius="lg"
        borderBottomLeftRadius="lg"
        borderTopRightRadius={0}
        borderBottomRightRadius={0}
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="medium"
        fontSize="sm"
        lineHeight="normal"
        gap={2}
        _hover={{ bg: "neutral.800" }}
        _active={{ bg: "neutral.950" }}
        _disabled={{
          opacity: 0.5,
          cursor: "not-allowed",
          _hover: { bg: "neutral.900" },
        }}
      >
        {runSideLoading ? (
          <Spinner size="xs" color="currentColor" />
        ) : (
          <Icon as={runSideIcon} boxSize="16px" />
        )}
        {runSideLabel}
      </Button>

      <Menu.Root lazyMount unmountOnExit positioning={{ placement: "top-end" }}>
        <Menu.Trigger asChild>
          <Button
            type="button"
            disabled={!canOpenMenu}
            height="100%"
            minWidth="auto"
            px={2}
            py={1}
            bg="neutral.900"
            color="text.inverse"
            borderTopRightRadius="lg"
            borderBottomRightRadius="lg"
            borderTopLeftRadius={0}
            borderBottomLeftRadius={0}
            borderLeft="1px solid"
            borderLeftColor="neutral.700"
            fontFamily="'Pretendard Variable', sans-serif"
            fontWeight="medium"
            fontSize="sm"
            lineHeight="normal"
            aria-label="실행 메뉴 열기"
            _hover={{ bg: "neutral.800" }}
            _active={{ bg: "neutral.950" }}
            _expanded={{ bg: "neutral.950" }}
            _disabled={{
              opacity: 0.5,
              cursor: "not-allowed",
              _hover: { bg: "neutral.900" },
            }}
          >
            <Icon as={MdKeyboardArrowDown} boxSize="18px" />
          </Button>
        </Menu.Trigger>

        <Portal>
          <Menu.Positioner zIndex={20}>
            <Menu.Content
              minW="168px"
              p={1.5}
              borderRadius="xl"
              borderColor="border.default"
              boxShadow="lg"
            >
              <Menu.Item
                value="trigger-settings"
                onSelect={onOpenTriggerSettings}
              >
                자동 실행 설정
              </Menu.Item>
              <Menu.Item value="preflight-check" onSelect={onCheckBeforeRun}>
                현재 설정 확인
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Box>
  );
};
