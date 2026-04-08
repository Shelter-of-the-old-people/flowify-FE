import { Box, Heading, SimpleGrid, Text } from "@chakra-ui/react";

const templateCategories = [
  "자동 수집",
  "문서 정리",
  "리포트 생성",
  "알림 자동화",
];

export default function TemplatesPage() {
  return (
    <Box maxW="1200px" mx="auto">
      <Box mb={10}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
          템플릿
        </Text>
        <Heading size="xl" mb={3}>
          바로 시작할 템플릿
        </Heading>
        <Text color="gray.600">
          자주 쓰는 자동화 템플릿을 탐색하고 상세 화면으로 이동할 수 있는
          영역입니다.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
        {templateCategories.map((category) => (
          <Box
            key={category}
            p={6}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="24px"
            boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
          >
            <Heading size="md" mb={3}>
              {category}
            </Heading>
            <Text color="gray.600">
              {category} 관련 템플릿 카드 목록이 들어갈 자리입니다.
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
