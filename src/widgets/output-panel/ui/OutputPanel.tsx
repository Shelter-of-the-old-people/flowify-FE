import { Box, Text } from "@chakra-ui/react";

import { useWorkflowStore } from "@/shared";

export const OutputPanel = () => {
  const activePanelNodeId = useWorkflowStore((s) => s.activePanelNodeId);
  const isOpen = Boolean(activePanelNodeId);

  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      width="360px"
      height="100%"
      bg="bg.surface"
      borderLeft="1px solid"
      borderColor="border.default"
      overflowY="auto"
      p={4}
      zIndex={5}
      transform={isOpen ? "translateX(0)" : "translateX(100%)"}
      transition="transform 200ms ease"
    >
      <Text fontSize="sm" color="text.secondary">
        출력 데이터 미리보기 준비 중
      </Text>
    </Box>
  );
};
