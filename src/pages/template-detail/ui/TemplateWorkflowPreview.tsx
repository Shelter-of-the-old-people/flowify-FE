import { Box, Text, VStack } from "@chakra-ui/react";

export const TemplateWorkflowPreview = () => (
  <Box
    h="full"
    display="flex"
    alignItems="center"
    justifyContent="center"
    px={8}
  >
    <VStack
      gap={3}
      px={10}
      py={8}
      borderRadius="32px"
      bg="rgba(255,255,255,0.72)"
      border="1px solid"
      borderColor="whiteAlpha.700"
      backdropFilter="blur(10px)"
      boxShadow="0 18px 40px rgba(15, 23, 42, 0.08)"
      textAlign="center"
    >
      <Text fontSize="lg" fontWeight="semibold" color="text.primary">
        워크플로우 프리뷰 준비 중
      </Text>
      <Text maxW="360px" fontSize="sm" color="text.secondary">
        다음 단계에서 템플릿의 노드와 연결 정보를 읽기 전용 그래프로 표시합니다.
      </Text>
    </VStack>
  </Box>
);
