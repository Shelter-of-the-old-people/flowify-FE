import { MdAutoAwesome, MdTune } from "react-icons/md";

import { Box, Button, HStack, Heading, Text, VStack } from "@chakra-ui/react";

interface CreationMethodStepProps {
  onSubmit: (method: "ai" | "direct") => void;
  onPrev: () => void;
}

export const CreationMethodStep = ({
  onSubmit,
  onPrev,
}: CreationMethodStepProps) => {
  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="md">중간 과정을 어떻게 만들까요?</Heading>
        <Text fontSize="sm" color="text.secondary" mt={1}>
          생성 방식을 선택하세요
        </Text>
      </Box>

      <VStack gap={4}>
        <Box
          as="button"
          w="100%"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="border.default"
          textAlign="left"
          cursor="pointer"
          _hover={{ borderColor: "blue.400", bg: "blue.50" }}
          onClick={() => onSubmit("ai")}
        >
          <HStack gap={3} mb={2}>
            <Box as={MdAutoAwesome} boxSize={5} color="blue.500" />
            <Text fontWeight="bold">AI로 생성하기</Text>
          </HStack>
          <Text fontSize="sm" color="text.secondary">
            대화를 통해 AI가 자동으로 중간 과정을 구성합니다
          </Text>
        </Box>

        <Box
          as="button"
          w="100%"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="border.default"
          textAlign="left"
          cursor="pointer"
          _hover={{ borderColor: "green.400", bg: "green.50" }}
          onClick={() => onSubmit("direct")}
        >
          <HStack gap={3} mb={2}>
            <Box as={MdTune} boxSize={5} color="green.500" />
            <Text fontWeight="bold">직접 설정하기</Text>
          </HStack>
          <Text fontSize="sm" color="text.secondary">
            단계별로 직접 노드를 구성합니다
          </Text>
        </Box>
      </VStack>

      <Button variant="outline" alignSelf="flex-start" onClick={onPrev}>
        이전
      </Button>
    </VStack>
  );
};
