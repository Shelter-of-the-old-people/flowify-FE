import { Box, Heading, SimpleGrid, Text } from "@chakra-ui/react";

const placeholderCards = [
  {
    title: "워크플로우 준비 중",
    description: "사이드바에서 새 워크플로우 버튼으로 바로 편집기 진입 가능",
  },
  {
    title: "실행 상태 요약",
    description: "여기에서 최근 실행 흐름과 상태를 보여줄 수 있음",
  },
  {
    title: "공유 및 관리",
    description: "워크플로우 정렬, 검색, 공유 기능 자리",
  },
];

export default function WorkflowsPage() {
  return (
    <Box maxW="1200px" mx="auto">
      <Box mb={10}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
          내 워크플로우
        </Text>
        <Heading size="xl" mb={3}>
          워크플로우
        </Heading>
        <Text color="gray.600">
          새 워크플로우 생성, 최근 작업 확인, 공유 관리가 들어갈 영역입니다.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={5}>
        {placeholderCards.map((card) => (
          <Box
            key={card.title}
            p={6}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="24px"
            boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
          >
            <Heading size="md" mb={3}>
              {card.title}
            </Heading>
            <Text color="gray.600">{card.description}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
