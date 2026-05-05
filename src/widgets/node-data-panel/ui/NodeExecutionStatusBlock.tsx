import { Box, Text } from "@chakra-ui/react";

import { type ExecutionNodeData } from "@/entities";

import { getExecutionStatusNotice } from "../model";

type Props = {
  executionData: ExecutionNodeData | null;
};

export const NodeExecutionStatusBlock = ({ executionData }: Props) => {
  const notice = getExecutionStatusNotice(executionData);

  if (!notice) {
    return null;
  }

  const isError = notice.tone === "error";

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Text fontSize="md" fontWeight="bold">
        실행 상태
      </Text>
      <Box
        px={4}
        py={3}
        borderRadius="xl"
        bg={isError ? "red.50" : "orange.50"}
        border="1px solid"
        borderColor={isError ? "red.100" : "orange.100"}
      >
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color={isError ? "red.500" : "orange.600"}
        >
          {notice.title}
        </Text>
        {notice.description ? (
          <Text mt={1} fontSize="xs" color="text.secondary">
            {notice.description}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
};
