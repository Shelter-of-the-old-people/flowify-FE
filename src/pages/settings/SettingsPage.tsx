import {
  Box,
  HStack,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";

import { ROUTE_PATHS, getAuthUser } from "@/shared";

export default function SettingsPage() {
  const authUser = getAuthUser();

  return (
    <Box maxW="1200px" mx="auto">
      <Box mb={10}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
          SETTINGS
        </Text>
        <Heading size="xl" mb={3}>
          앱 설정과 운영 정보
        </Heading>
        <Text color="gray.600">
          현재 앱 환경과 연동 상태를 한 화면에서 점검할 수 있도록 정리했습니다.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={6}>
        <Box
          p={8}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={3}>
            ENVIRONMENT
          </Text>
          <Heading size="md" mb={4}>
            실행 환경
          </Heading>
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <Text color="gray.500">API Base URL</Text>
              <Text fontWeight="medium">
                {import.meta.env.VITE_API_BASE_URL ?? "-"}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">실행 폴링 간격</Text>
              <Text fontWeight="medium">
                {import.meta.env.VITE_EXECUTION_POLL_INTERVAL_MS ?? "3000"} ms
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">로그인 콜백 경로</Text>
              <Text fontWeight="medium">{ROUTE_PATHS.LOGIN_CALLBACK}</Text>
            </HStack>
          </VStack>
        </Box>

        <Box
          p={8}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="28px"
          boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
        >
          <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={3}>
            SESSION
          </Text>
          <Heading size="md" mb={4}>
            세션 점검
          </Heading>
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <Text color="gray.500">로그인 사용자</Text>
              <Text fontWeight="medium">{authUser?.name ?? "-"}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">이메일</Text>
              <Text fontWeight="medium">{authUser?.email ?? "-"}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">세션 상태</Text>
              <Text fontWeight="medium">
                {authUser ? "정상" : "사용자 정보 없음"}
              </Text>
            </HStack>
          </VStack>
        </Box>
      </SimpleGrid>

      <Box
        mt={6}
        p={8}
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="28px"
        boxShadow="0 10px 30px rgba(15, 23, 42, 0.04)"
      >
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={3}>
          ROADMAP
        </Text>
        <Heading size="md" mb={4}>
          다음 확장 대상
        </Heading>
        <VStack align="stretch" gap={3}>
          <Text color="gray.600">
            사용자 정보 수정 API가 준비되면 이 화면에서 이름 변경과 프로필
            관리까지 이어서 붙일 수 있습니다.
          </Text>
          <Text color="gray.600">
            OAuth 연결 흐름은 계정 화면에서 먼저 사용 가능하도록 두고, 이 화면은
            운영 상태와 환경 점검 중심으로 유지했습니다.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
