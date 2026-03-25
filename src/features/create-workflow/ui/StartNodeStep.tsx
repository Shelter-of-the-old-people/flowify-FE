import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

import type { NodeSelection } from "../model/useCreateWorkflow";

interface StartNodeStepProps {
  selection: NodeSelection;
  onSelect: (selection: NodeSelection) => void;
  onNext: () => void;
}

export const StartNodeStep = ({
  selection,
  onSelect,
  onNext,
}: StartNodeStepProps) => {
  // TODO: 매핑 규칙 확정 후 카테고리 → 서비스 → 실행 조건 → 데이터 대상 선택지 구현
  void selection;
  void onSelect;

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="md">어디에서 데이터를 가져올까요?</Heading>
        <Text fontSize="sm" color="text.secondary" mt={1}>
          자동화의 시작점을 선택하세요
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

      <Button alignSelf="flex-end" onClick={onNext}>
        다음
      </Button>
    </VStack>
  );
};
