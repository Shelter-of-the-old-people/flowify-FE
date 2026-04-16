import { MdPause, MdPlayArrow } from "react-icons/md";

import { Box, Button, Icon, Spinner } from "@chakra-ui/react";

type RunStopSplitButtonProps = {
  isRunning: boolean;
  isRunPending: boolean;
  isStopPending: boolean;
  isSavePending: boolean;
  canRun: boolean;
  canStop: boolean;
  canSave: boolean;
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
};

/**
 * Figma 1878:3330 기준 오른쪽 스플릿 버튼.
 *
 * 왼쪽 파트(실행/중지 토글) + 구분선 + 오른쪽 파트(저장).
 * 스펙 §4.2: 실행 중에는 라벨이 "중지"로 토글되고 중지 API를 호출한다.
 * 스펙 §4.3: 실행 중에는 저장 파트가 disabled된다.
 */
export const RunStopSplitButton = ({
  isRunning,
  isRunPending,
  isStopPending,
  isSavePending,
  canRun,
  canStop,
  canSave,
  onRun,
  onStop,
  onSave,
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
        px="8px"
        py={0}
        bg="#272727"
        color="#efefef"
        borderTopLeftRadius="10px"
        borderBottomLeftRadius="10px"
        borderTopRightRadius={0}
        borderBottomRightRadius={0}
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="normal"
        fontSize="14px"
        lineHeight="normal"
        gap="8px"
        _hover={{ bg: "#3a3a3a" }}
        _active={{ bg: "#1f1f1f" }}
        _disabled={{
          opacity: 0.5,
          cursor: "not-allowed",
          _hover: { bg: "#272727" },
        }}
      >
        {runSideLoading ? (
          <Spinner size="xs" color="#efefef" />
        ) : (
          <Icon as={runSideIcon} boxSize="16px" />
        )}
        {runSideLabel}
      </Button>

      <Button
        type="button"
        onClick={onSave}
        disabled={!canSave || isSavePending}
        height="100%"
        minWidth="auto"
        px="8px"
        py="4px"
        bg="#272727"
        color="#efefef"
        borderTopRightRadius="10px"
        borderBottomRightRadius="10px"
        borderTopLeftRadius={0}
        borderBottomLeftRadius={0}
        borderLeft="1px solid #f6f6f6"
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="normal"
        fontSize="14px"
        lineHeight="normal"
        _hover={{ bg: "#3a3a3a" }}
        _active={{ bg: "#1f1f1f" }}
        _disabled={{
          opacity: 0.5,
          cursor: "not-allowed",
          _hover: { bg: "#272727" },
        }}
      >
        {isSavePending ? <Spinner size="xs" color="#efefef" /> : "저장"}
      </Button>
    </Box>
  );
};
