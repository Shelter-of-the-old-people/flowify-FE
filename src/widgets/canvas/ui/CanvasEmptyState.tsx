import { MdAdd } from "react-icons/md";

import { Box, Icon, IconButton, Text, VStack } from "@chakra-ui/react";

interface CanvasEmptyStateProps {
  onAdd: () => void;
}

export const CanvasEmptyState = ({ onAdd }: CanvasEmptyStateProps) => {
  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
      zIndex={5}
    >
      <VStack gap={4} pointerEvents="auto">
        <Text fontSize="md" color="text.secondary" fontWeight="medium">
          워크플로우를 시작하세요
        </Text>
        <IconButton
          aria-label="시작하기"
          rounded="full"
          size="lg"
          onClick={onAdd}
        >
          <Icon as={MdAdd} boxSize={6} />
        </IconButton>
      </VStack>
    </Box>
  );
};
