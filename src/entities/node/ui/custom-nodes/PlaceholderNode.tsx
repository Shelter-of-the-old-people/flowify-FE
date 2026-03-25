import { MdAdd } from "react-icons/md";

import { Box, Icon, Text, VStack } from "@chakra-ui/react";
import { Handle, Position } from "@xyflow/react";

export const PlaceholderNode = () => {
  return (
    <Box
      border="2px dashed"
      borderColor="border.default"
      borderRadius="lg"
      minW="200px"
      bg="bg.surface"
      cursor="pointer"
      _hover={{ borderColor: "blue.400", bg: "blue.50" }}
      transition="border-color 150ms ease, background 150ms ease"
    >
      <Handle type="target" position={Position.Left} />

      <VStack gap={1} py={6} px={4}>
        <Icon as={MdAdd} boxSize={6} color="text.secondary" />
        <Text fontSize="sm" color="text.secondary">
          다음 단계를 설정하세요
        </Text>
      </VStack>
    </Box>
  );
};
