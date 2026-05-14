import { Box, HStack, Heading, Text, VStack } from "@chakra-ui/react";

import AccountPage from "@/pages/account/AccountPage";
import { ROUTE_PATHS } from "@/shared";

export default function SettingsPage() {
  return (
    <>
      <AccountPage
        headingEyebrow="SETTINGS"
        headingTitle="계정과 서비스 설정"
        headingDescription="로그인 정보와 외부 서비스 연결 상태를 설정 화면에서 관리합니다."
        manualTokenLocationLabel="설정 화면"
        showQuickLinks={false}
      />

      <Box maxW="1200px" mx="auto" mt={6}>
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
              <Text fontWeight="medium">{ROUTE_PATHS.AUTH_CALLBACK}</Text>
            </HStack>
          </VStack>
        </Box>

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
              OAuth와 직접 토큰 연결 흐름은 위의 계정과 서비스 설정 섹션에서
              함께 관리하도록 정리했습니다.
            </Text>
          </VStack>
        </Box>
      </Box>
    </>
  );
}
