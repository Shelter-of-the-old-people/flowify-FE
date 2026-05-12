import { Box, Button, Text } from "@chakra-ui/react";

import { type WorkflowFilterKey } from "../model";

type Props = {
  filter: WorkflowFilterKey;
  isCreatePending: boolean;
  onCreate: () => void;
};

const EMPTY_STATE_COPY: Record<
  WorkflowFilterKey,
  { title: string; description: string; showCreate: boolean }
> = {
  all: {
    title: "아직 만든 워크플로우가 없습니다.",
    description: "첫 워크플로우를 만들고 자동화 흐름을 바로 구성해보세요.",
    showCreate: true,
  },
  running: {
    title: "실행 중인 워크플로우가 없습니다.",
    description:
      "워크플로우를 실행하거나 활성화된 스케줄 워크플로우가 있으면 여기에 표시됩니다.",
    showCreate: false,
  },
  stopped: {
    title: "중지된 워크플로우가 없습니다.",
    description:
      "중지된 워크플로우가 생기면 이 필터에서 따로 확인할 수 있습니다.",
    showCreate: false,
  },
};

export const WorkflowListEmptyState = ({
  filter,
  isCreatePending,
  onCreate,
}: Props) => {
  const copy = EMPTY_STATE_COPY[filter];

  return (
    <Box
      p={6}
      bg="bg.surface"
      border="1px dashed"
      borderColor="border.default"
      borderRadius="2xl"
    >
      <Text fontSize="sm" fontWeight="medium" color="text.primary">
        {copy.title}
      </Text>
      <Text mt={2} fontSize="xs" color="text.secondary">
        {copy.description}
      </Text>
      {copy.showCreate ? (
        <Button
          mt={4}
          size="sm"
          bg="black"
          color="bg.surface"
          disabled={isCreatePending}
          _hover={{ bg: "neutral.900" }}
          onClick={onCreate}
        >
          워크플로우 만들기
        </Button>
      ) : null}
    </Box>
  );
};
