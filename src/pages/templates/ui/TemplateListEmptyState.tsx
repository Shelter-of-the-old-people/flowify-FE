import { Box, Heading, Text } from "@chakra-ui/react";

export const TemplateListEmptyState = () => (
  <Box
    p={6}
    bg="bg.surface"
    border="1px dashed"
    borderColor="border.default"
    borderRadius="2xl"
  >
    <Heading size="md" mb={3}>
      표시할 템플릿이 없습니다
    </Heading>
    <Text color="text.secondary">
      현재 표시할 수 있는 템플릿이 없습니다. 잠시 뒤 다시 확인해보세요.
    </Text>
  </Box>
);
