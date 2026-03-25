import { Box, Button, HStack, Heading, Text, VStack } from "@chakra-ui/react";

import type { NodeSelection } from "../model/useCreateWorkflow";

interface EndNodeStepProps {
  selection: NodeSelection;
  onSelect: (selection: NodeSelection) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const EndNodeStep = ({
  selection,
  onSelect,
  onNext,
  onPrev,
}: EndNodeStepProps) => {
  // TODO: 매핑 규칙 확정 후 카테고리 → 서비스 → 동작 유형 선택지 구현
  void selection;
  void onSelect;

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="md">결과를 어디에 보낼까요?</Heading>
        <Text fontSize="sm" color="text.secondary" mt={1}>
          자동화의 도착점을 선택하세요
        </Text>
      </Box>

      <Box
        p={6}
        borderRadius="lg"
        border="1px dashed"
        borderColor="border.default"
        textAlign="center"
      >
        <Text fontSize="sm" color="text.secondary">
          카테고리 및 서비스 선택지 준비 중
        </Text>
      </Box>

      <HStack justify="space-between">
        <Button variant="outline" onClick={onPrev}>
          이전
        </Button>
        <Button onClick={onNext}>다음</Button>
      </HStack>
    </VStack>
  );
};
