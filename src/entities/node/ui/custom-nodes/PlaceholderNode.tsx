import { MdAdd } from "react-icons/md";

import { Box, Icon, Text, VStack } from "@chakra-ui/react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";

type PlaceholderNodeData = {
  label?: string;
};

export const PlaceholderNode = ({
  data,
}: NodeProps<Node<PlaceholderNodeData>>) => {
  return (
    <VStack gap="10px" cursor="pointer">
      <Handle type="target" position={Position.Left} />

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
      <Text fontSize="20px" fontWeight="bold" color="black" textAlign="center">
        {data.label ?? "다음"}
      </Text>
    </VStack>
  );
};
