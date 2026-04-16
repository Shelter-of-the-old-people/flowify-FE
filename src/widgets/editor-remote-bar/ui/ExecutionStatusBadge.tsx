import { Box, Text } from "@chakra-ui/react";

import { type ExecutionStatus } from "@/entities";

type ExecutionStatusBadgeProps = {
  status: ExecutionStatus;
};

/**
 * 리모컨 바 상단에 떠있는 실행 상태 메시지.
 *
 * 스펙(EDITOR_REMOTE_BAR_DESIGN.md §3.7, §5):
 * - `running` 상태일 때만 "실행 중…"을 노출한다.
 * - 그 외 상태(idle/success/failed)에서는 렌더 자체를 하지 않는다.
 * - 성공/실패 피드백은 버튼 상태 복귀 + 롤백 활성화로 암시적으로 표현.
 */
export const ExecutionStatusBadge = ({ status }: ExecutionStatusBadgeProps) => {
  if (status !== "running") {
    return null;
  }

  return (
    <Box
      position="absolute"
      bottom="100%"
      left="50%"
      transform="translateX(-50%)"
      mb="8px"
      px="12px"
      py="4px"
      bg="#272727"
      color="#efefef"
      borderRadius="999px"
      boxShadow="0px 4px 4px rgba(0, 0, 0, 0.15)"
      pointerEvents="none"
      whiteSpace="nowrap"
    >
      <Text
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="normal"
        fontSize="12px"
      >
        실행 중…
      </Text>
    </Box>
  );
};
