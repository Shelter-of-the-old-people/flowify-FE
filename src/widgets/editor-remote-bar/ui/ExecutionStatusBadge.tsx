import { Box, Text } from "@chakra-ui/react";

type ExecutionStatusBadgeProps = {
  label?: string | null;
};

/**
 * 리모컨 바 상단에 떠있는 실행 상태 메시지.
 *
 * 스펙(EDITOR_REMOTE_BAR_DESIGN.md §3.7, §5):
 * - `running` 상태일 때만 "실행 중…"을 노출한다.
 * - 그 외 상태(idle/success/failed)에서는 렌더 자체를 하지 않는다.
 * - 성공/실패 피드백은 버튼 상태 복귀 + 롤백 활성화로 암시적으로 표현.
 */
export const ExecutionStatusBadge = ({
  label = null,
}: ExecutionStatusBadgeProps) => {
  if (!label) {
    return null;
  }

  return (
    <Box
      position="absolute"
      bottom="100%"
      left="50%"
      transform="translateX(-50%)"
      mb="8px"
      px={3}
      py={1}
      bg="neutral.900"
      color="text.inverse"
      borderRadius="full"
      boxShadow="md"
      pointerEvents="none"
      whiteSpace="nowrap"
    >
      <Text
        fontFamily="'Pretendard Variable', sans-serif"
        fontWeight="medium"
        fontSize="xs"
      >
        {label}
      </Text>
    </Box>
  );
};
