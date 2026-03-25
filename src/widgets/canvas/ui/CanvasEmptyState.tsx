import { MdAdd } from "react-icons/md";

import { Box, Icon, Text, VStack } from "@chakra-ui/react";

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
      <VStack gap="10px" pointerEvents="auto" cursor="pointer" onClick={onAdd}>
        <Box
          w="100px"
          h="100px"
          border="2px dashed"
          borderColor="gray.400"
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
          _hover={{ borderColor: "blue.400", bg: "blue.50" }}
          transition="border-color 150ms ease, background 150ms ease"
        >
          <Icon as={MdAdd} boxSize={8} color="gray.400" />
        </Box>
        <Text
          fontSize="20px"
          fontWeight="bold"
          color="black"
          textAlign="center"
        >
          시작
        </Text>
      </VStack>
    </Box>
  );
};
