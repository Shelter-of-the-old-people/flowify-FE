import { Box, Button, HStack, Heading, Text, VStack } from "@chakra-ui/react";

export default function TemplateDetailPage() {
  return (
    <Box maxW="960px" mx="auto">
      <VStack align="stretch" gap={6}>
        <Box
          p={{ base: 6, md: 8 }}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
            템플릿 상세
          </Text>
          <Heading size="xl" mb={3}>
            템플릿 제목
          </Heading>
          <Text color="gray.600" mb={8}>
            템플릿 설명, 사용 예시, 필요한 연결 서비스가 정리될 영역입니다.
          </Text>
          <HStack gap={3}>
            <Button colorScheme="blackAlpha">템플릿 사용</Button>
            <Button variant="outline">미리보기</Button>
          </HStack>
        </Box>

        <Box
          p={{ base: 6, md: 8 }}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Heading size="md" mb={4}>
            구성 요소
          </Heading>
          <Text color="gray.600">
            이 영역에는 템플릿 안 노드 구성, 예상 입력값, 실행 결과 예시를
            보여주게 됩니다.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
