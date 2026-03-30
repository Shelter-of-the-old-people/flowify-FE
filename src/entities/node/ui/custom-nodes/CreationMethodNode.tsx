import { MdAdd, MdAutoAwesome } from "react-icons/md";

import { Box, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";

type CreationMethodNodeData = {
  onSelectManual?: () => void;
};

export const CreationMethodNode = ({
  data,
}: NodeProps<Node<CreationMethodNodeData>>) => {
  return (
    <Box position="relative">
      <Handle type="target" position={Position.Left} />

      <Text
        position="absolute"
        top="-32px"
        left="50%"
        transform="translateX(-50%)"
        fontSize="md"
        fontWeight="bold"
        color="black"
        whiteSpace="nowrap"
      >
        생성 방식을 결정하세요.
      </Text>

      <HStack gap="16px" alignItems="center">
        <VStack
          gap="8px"
          cursor="pointer"
          onClick={(e) => {
            e.stopPropagation();
            data.onSelectManual?.();
          }}
          _hover={{ opacity: 0.7 }}
          transition="opacity 150ms ease"
        >
          <Box
            w="80px"
            h="80px"
            border="2px dashed"
            borderColor="gray.400"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={MdAdd} boxSize={7} color="gray.400" />
          </Box>
          <Text fontSize="xs" color="gray.600" textAlign="center">
            다음 노드 설정하기
          </Text>
        </VStack>

        <Text fontSize="sm" color="gray.400" fontWeight="bold">
          or
        </Text>

        <VStack gap="8px" cursor="not-allowed" opacity={0.5}>
          <Box
            w="80px"
            h="80px"
            border="2px dashed"
            borderColor="gray.400"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={MdAutoAwesome} boxSize={7} color="gray.400" />
          </Box>
          <Text fontSize="xs" color="gray.600" textAlign="center">
            AI로 중간 과정 생성하기
          </Text>
        </VStack>
      </HStack>

      <Handle type="source" position={Position.Right} />
    </Box>
  );
};
