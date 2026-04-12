import { MdAdd } from "react-icons/md";

import { Box, Button, Flex, Icon, Text } from "@chakra-ui/react";

type Props = {
  isCreatePending: boolean;
  onCreate: () => void;
};

export const WorkflowListHeader = ({ isCreatePending, onCreate }: Props) => (
  <Flex align="center" justify="space-between" gap={6} wrap="wrap">
    <Box>
      <Text fontSize="xl" fontWeight="bold" color="text.primary">
        내 자동화 목록
      </Text>
      <Text mt={1} fontSize="sm" color="text.secondary">
        내가 구축한 자동화 시스템 목록
      </Text>
    </Box>

    <Button
      bg="black"
      color="bg.surface"
      px={3}
      py={1.5}
      h="auto"
      borderRadius="xl"
      fontSize="sm"
      fontWeight="semibold"
      display="inline-flex"
      alignItems="center"
      gap={2}
      disabled={isCreatePending}
      _hover={{ bg: "neutral.900" }}
      onClick={onCreate}
    >
      <Icon as={MdAdd} boxSize={3} />
      {isCreatePending ? "자동화 시스템 생성 중.." : "자동화 시스템 만들기"}
    </Button>
  </Flex>
);
