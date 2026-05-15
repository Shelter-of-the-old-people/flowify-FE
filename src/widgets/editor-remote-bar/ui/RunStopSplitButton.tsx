import { MdPlayArrow, MdScience, MdStop } from "react-icons/md";

import { Box, Button, Icon, Spinner, Text } from "@chakra-ui/react";

export type PrimaryRunActionKind =
  | "run"
  | "stop"
  | "enable-auto-run"
  | "disable-auto-run"
  | "disable-auto-run-and-stop";

type RunStopSplitButtonProps = {
  primaryActionKind: PrimaryRunActionKind;
  primaryLabel: string;
  isPrimaryPending: boolean;
  canPrimaryAction: boolean;
  showTestButton: boolean;
  isTestPending: boolean;
  canTestRun: boolean;
  onPrimaryAction: () => void;
  onTestRun: () => void;
};

const STOP_ACTIONS: PrimaryRunActionKind[] = [
  "stop",
  "disable-auto-run",
  "disable-auto-run-and-stop",
];

export const RunStopSplitButton = ({
  primaryActionKind,
  primaryLabel,
  isPrimaryPending,
  canPrimaryAction,
  showTestButton,
  isTestPending,
  canTestRun,
  onPrimaryAction,
  onTestRun,
}: RunStopSplitButtonProps) => {
  const primaryIcon = STOP_ACTIONS.includes(primaryActionKind)
    ? MdStop
    : MdPlayArrow;
  const primaryDisabled = !canPrimaryAction || isPrimaryPending;
  const testDisabled = !canTestRun || isTestPending;

  return (
    <Box display="flex" height="30px" alignItems="center" flexShrink={0}>
      <Button
        type="button"
        aria-label={primaryLabel}
        title={primaryLabel}
        onClick={onPrimaryAction}
        disabled={primaryDisabled}
        height="100%"
        px={{ base: 1.5, "2xl": 2.5 }}
        bg="neutral.900"
        color="text.inverse"
        borderTopLeftRadius="lg"
        borderBottomLeftRadius="lg"
        borderTopRightRadius={showTestButton ? 0 : "lg"}
        borderBottomRightRadius={showTestButton ? 0 : "lg"}
        _hover={{ bg: "neutral.800" }}
        _active={{ bg: "neutral.950" }}
        gap={1}
        _disabled={{
          opacity: 0.5,
          cursor: "not-allowed",
          _hover: { bg: "neutral.900" },
        }}
      >
        {isPrimaryPending ? (
          <Spinner size="xs" color="currentColor" />
        ) : (
          <Icon as={primaryIcon} boxSize={4.5} />
        )}
        <Text as="span" display={{ base: "none", "2xl": "inline" }}>
          {primaryLabel}
        </Text>
      </Button>

      {showTestButton ? (
        <Button
          type="button"
          aria-label="테스트 실행"
          title="테스트 실행"
          onClick={onTestRun}
          disabled={testDisabled}
          height="100%"
          minW="30px"
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
          _disabled={{
            opacity: 0.5,
            cursor: "not-allowed",
            _hover: { bg: "neutral.900" },
          }}
        >
          {isTestPending ? (
            <Spinner size="xs" color="currentColor" />
          ) : (
            <Icon as={MdScience} boxSize={4.5} />
          )}
        </Button>
      ) : null}
    </Box>
  );
};
