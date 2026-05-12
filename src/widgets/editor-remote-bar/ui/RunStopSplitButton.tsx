import { MdKeyboardArrowDown, MdPlayArrow, MdStop } from "react-icons/md";

import {
  Box,
  Button,
  Icon,
  Menu,
  Portal,
  Spinner,
  Text,
} from "@chakra-ui/react";

type RunStopSplitButtonProps = {
  isRunning: boolean;
  isRunPending: boolean;
  isStopPending: boolean;
  canRun: boolean;
  canStop: boolean;
  canOpenMenu: boolean;
  onRun: () => void;
  onStop: () => void;
  onOpenMenu?: () => void;
  onOpenTriggerSettings: () => void;
  onCheckBeforeRun: () => void;
};

export const RunStopSplitButton = ({
  isRunning,
  isRunPending,
  isStopPending,
  canRun,
  canStop,
  canOpenMenu,
  onRun,
  onStop,
  onOpenMenu,
  onOpenTriggerSettings,
  onCheckBeforeRun,
}: RunStopSplitButtonProps) => {
  const runSideDisabled = isRunning
    ? !canStop || isStopPending
    : !canRun || isRunPending;
  const runSideLoading = isRunning ? isStopPending : isRunPending;
  const runSideLabel = isRunning ? "실행 중지" : "실행";
  const runSideIcon = isRunning ? MdStop : MdPlayArrow;
  const handleRunSideClick = isRunning ? onStop : onRun;

  return (
    <Box display="flex" height="30px" alignItems="center" flexShrink={0}>
      <Button
        type="button"
        aria-label={runSideLabel}
        title={runSideLabel}
        onClick={handleRunSideClick}
        disabled={runSideDisabled}
        height="100%"
        px={{ base: 0, "2xl": 2 }}
        bg="neutral.900"
        color="text.inverse"
        borderTopLeftRadius="lg"
        borderBottomLeftRadius="lg"
        borderTopRightRadius={0}
        borderBottomRightRadius={0}
        _hover={{ bg: "neutral.800" }}
        _active={{ bg: "neutral.950" }}
        gap={1}
        _disabled={{
          opacity: 0.5,
          cursor: "not-allowed",
          _hover: { bg: "neutral.900" },
        }}
      >
        {runSideLoading ? (
          <Spinner size="xs" color="currentColor" />
        ) : (
          <Icon as={runSideIcon} boxSize={4.5} />
        )}
        <Text as="span" display={{ base: "none", "2xl": "inline" }}>
          {runSideLabel}
        </Text>
      </Button>

      <Menu.Root
        lazyMount
        unmountOnExit
        positioning={{ placement: "top-end" }}
        onOpenChange={(details) => {
          if (details.open) {
            onOpenMenu?.();
          }
        }}
      >
        <Menu.Trigger asChild>
          <Button
            type="button"
            aria-label="실행 메뉴 열기"
            title="실행 메뉴"
            disabled={!canOpenMenu}
            height="100%"
            minW="28px"
            px={0}
            bg="neutral.900"
            color="text.inverse"
            borderTopRightRadius="lg"
            borderBottomRightRadius="lg"
            borderTopLeftRadius={0}
            borderBottomLeftRadius={0}
            borderLeft="1px solid"
            borderLeftColor="neutral.700"
            _hover={{ bg: "neutral.800" }}
            _active={{ bg: "neutral.950" }}
            _expanded={{ bg: "neutral.950" }}
            _disabled={{
              opacity: 0.5,
              cursor: "not-allowed",
              _hover: { bg: "neutral.900" },
            }}
          >
            <Icon as={MdKeyboardArrowDown} boxSize={4.5} />
          </Button>
        </Menu.Trigger>

        <Portal>
          <Menu.Positioner zIndex={20}>
            <Menu.Content
              minW="168px"
              p={1.5}
              bg="bg.surface"
              border="1px solid"
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
