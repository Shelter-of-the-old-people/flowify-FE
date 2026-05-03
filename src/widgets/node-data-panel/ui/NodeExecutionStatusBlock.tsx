import { Box, Text } from "@chakra-ui/react";

import { type ExecutionNodeData } from "@/entities";

type Props = {
  executionData: ExecutionNodeData | null;
};

export const NodeExecutionStatusBlock = ({ executionData }: Props) => {
  if (!executionData) {
    return null;
  }

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text fontSize="md" fontWeight="bold">
        노드 상태
      </Text>
      <Box px={4} py={3} borderRadius="xl" bg="gray.50">
        <Text fontSize="sm" fontWeight="semibold">
          {executionData.status ?? executionData.reason ?? "상태 없음"}
        </Text>
        {executionData.reason ? (
          <Text mt={1} fontSize="xs" color="text.secondary">
            {executionData.reason}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};
