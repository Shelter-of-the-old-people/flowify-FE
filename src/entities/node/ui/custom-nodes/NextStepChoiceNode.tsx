import { type MouseEvent } from "react";
import { MdArrowForward, MdCallSplit } from "react-icons/md";

import { Box, Button, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import { type Node, type NodeProps } from "@xyflow/react";

type NextStepChoiceNodeData = {
  disabled?: boolean;
  onSelectMiddle?: () => void;
  onSelectSink?: () => void;
};

export const NextStepChoiceNode = ({
  data,
}: NodeProps<Node<NextStepChoiceNodeData>>) => {
  const handleSelectMiddle = (event: MouseEvent) => {
    event.stopPropagation();
    if (data.disabled) return;
    data.onSelectMiddle?.();
  };

  const handleSelectSink = (event: MouseEvent) => {
    event.stopPropagation();
    if (data.disabled) return;
    data.onSelectSink?.();
  };

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="2xl"
      boxShadow="0 10px 24px rgba(15, 23, 42, 0.12)"
      minW="244px"
      p={4}
    >
      <Text fontSize="sm" fontWeight="bold" mb={3} textAlign="center">
        다음 단계 선택
      </Text>

      <VStack align="stretch" gap={2}>
        <Button
          disabled={data.disabled}
          h="auto"
          justifyContent="flex-start"
          px={4}
          py={3}
          variant="ghost"
          onClick={handleSelectMiddle}
        >
          <HStack gap={3}>
            <Icon as={MdCallSplit} boxSize={5} color="gray.700" />
            <Box textAlign="left">
              <Text fontSize="sm" fontWeight="semibold">
                중간 처리 추가
              </Text>
              <Text color="text.secondary" fontSize="xs">
                처리 노드 설정
              </Text>
            </Box>
          </HStack>
        </Button>

        <Button
          disabled={data.disabled}
          h="auto"
          justifyContent="flex-start"
          px={4}
          py={3}
          variant="ghost"
          onClick={handleSelectSink}
        >
          <HStack gap={3}>
            <Icon as={MdArrowForward} boxSize={5} color="gray.700" />
            <Box textAlign="left">
              <Text fontSize="sm" fontWeight="semibold">
                보낼 곳 설정
              </Text>
              <Text color="text.secondary" fontSize="xs">
                도착 노드 설정
              </Text>
            </Box>
          </HStack>
        </Button>
      </VStack>
    </Box>
  );
};
