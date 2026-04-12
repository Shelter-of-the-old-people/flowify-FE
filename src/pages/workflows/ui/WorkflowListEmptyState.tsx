import { Box, Button, Text } from "@chakra-ui/react";

type Props = {
  hasWorkflows: boolean;
  isCreatePending: boolean;
  onCreate: () => void;
};

export const WorkflowListEmptyState = ({
  hasWorkflows,
  isCreatePending,
  onCreate,
}: Props) => (
  <Box
    p={6}
    bg="bg.surface"
    border="1px dashed"
    borderColor="border.default"
    borderRadius="2xl"
  >
    <Text fontSize="sm" fontWeight="medium" color="text.primary">
      {hasWorkflows
        ? "선택한 상태의 자동화가 없습니다."
        : "아직 구축한 자동화가 없습니다."}
    </Text>
    <Text mt={2} fontSize="xs" color="text.secondary">
      첫 자동화를 만들고 워크플로우 편집기로 바로 이동해보세요.
    </Text>
    {!hasWorkflows ? (
      <Button
        mt={4}
        size="sm"
        bg="black"
        color="bg.surface"
        disabled={isCreatePending}
        _hover={{ bg: "neutral.900" }}
        onClick={onCreate}
      >
        자동화 시스템 만들기
      </Button>
    ) : null}
  </Box>
);
