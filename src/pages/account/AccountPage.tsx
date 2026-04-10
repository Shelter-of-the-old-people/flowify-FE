import { useMemo } from "react";
import { useNavigate } from "react-router";

import {
  Box,
  Button,
  HStack,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  ROUTE_PATHS,
  getAuthUser,
  useConnectOAuthTokenMutation,
  useDisconnectOAuthTokenMutation,
  useOAuthTokensQuery,
} from "@/shared";

const OAUTH_SERVICES = [
  { key: "communication", label: "Communication" },
  { key: "storage", label: "Storage" },
  { key: "spreadsheet", label: "Spreadsheet" },
  { key: "calendar", label: "Calendar" },
  { key: "notification", label: "Notification" },
] as const;

export default function AccountPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const { data: tokens, isLoading, isError, refetch } = useOAuthTokensQuery();
  const { mutateAsync: connectToken, isPending: isConnectPending } =
    useConnectOAuthTokenMutation();
  const { mutateAsync: disconnectToken, isPending: isDisconnectPending } =
    useDisconnectOAuthTokenMutation();

  const tokenMap = useMemo(
    () => new Map((tokens ?? []).map((token) => [token.service, token])),
    [tokens],
  );

  const handleConnect = async (service: string) => {
    try {
      const result = await connectToken(service);
      window.location.assign(result.authUrl);
    } catch {
      // 화면의 기본 상태 문구로 충분히 안내한다.
    }
  };

  const handleDisconnect = async (service: string) => {
    try {
      await disconnectToken(service);
      await refetch();
    } catch {
      // 화면의 기본 상태 문구로 충분히 안내한다.
    }
  };

  return (
    <Box maxW="1200px" mx="auto">
      <Box mb={10}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
          ACCOUNT
        </Text>
        <Heading size="xl" mb={3}>
          계정과 서비스 연결
        </Heading>
        <Text color="gray.600">
          현재 로그인 정보와 외부 서비스 연결 상태를 한 번에 확인할 수 있습니다.
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
            PROFILE
          </Text>
          <Heading size="lg" mb={2}>
            {authUser?.name ?? "로그인 사용자"}
          </Heading>
          <Text color="gray.600" mb={6}>
            {authUser?.email ?? "저장된 사용자 정보가 없습니다."}
          </Text>

          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <Text color="gray.500">사용자 ID</Text>
              <Text fontWeight="medium">{authUser?.id ?? "-"}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">가입 시각</Text>
              <Text fontWeight="medium">
                {authUser?.createdAt
                  ? new Date(authUser.createdAt).toLocaleString()
                  : "-"}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">세션 상태</Text>
              <Text fontWeight="medium">
                {authUser ? "로그인 유지 중" : "세션 정보 없음"}
              </Text>
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
            QUICK LINKS
          </Text>
          <Heading size="md" mb={4}>
            자주 쓰는 화면
          </Heading>
          <VStack align="stretch" gap={3}>
            <Button
              justifyContent="flex-start"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.WORKFLOWS)}
            >
              워크플로우 목록
            </Button>
            <Button
              justifyContent="flex-start"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.TEMPLATES)}
            >
              템플릿 목록
            </Button>
            <Button
              justifyContent="flex-start"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.SETTINGS)}
            >
              설정 화면
            </Button>
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
        <HStack justify="space-between" align="flex-start" mb={6}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="gray.500" mb={2}>
              OAUTH CONNECTIONS
            </Text>
            <Heading size="md" mb={2}>
              외부 서비스 연결
            </Heading>
            <Text color="gray.600">
              서비스별 연결 상태를 확인하고 다시 연결하거나 해제할 수 있습니다.
            </Text>
          </Box>
          {isLoading || isConnectPending || isDisconnectPending ? (
            <Spinner size="sm" />
          ) : null}
        </HStack>

        {isError ? (
          <VStack align="stretch" gap={3}>
            <Text color="red.500">연결 목록을 불러오지 못했습니다.</Text>
            <Button
              alignSelf="flex-start"
              variant="outline"
              onClick={() => void refetch()}
            >
              다시 시도
            </Button>
          </VStack>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {OAUTH_SERVICES.map((service) => {
              const token = tokenMap.get(service.key);
              const connected = token?.connected ?? false;

              return (
                <Box
                  key={service.key}
                  p={5}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="20px"
                  bg={connected ? "green.50" : "gray.50"}
                >
                  <HStack justify="space-between" align="flex-start" mb={3}>
                    <Box>
                      <Heading size="sm" mb={1}>
                        {service.label}
                      </Heading>
                      <Text fontSize="sm" color="gray.600">
                        {connected ? "연결 완료" : "연결 필요"}
                      </Text>
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight="semibold"
                      color={connected ? "green.600" : "gray.500"}
                    >
                      {connected ? "CONNECTED" : "DISCONNECTED"}
                    </Text>
                  </HStack>

                  <VStack align="stretch" gap={2} mb={4}>
                    <Text fontSize="sm" color="gray.600">
                      계정 {token?.accountEmail ?? "-"}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      만료{" "}
                      {token?.expiresAt
                        ? new Date(token.expiresAt).toLocaleString()
                        : "-"}
                    </Text>
                  </VStack>

                  {connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDisconnect(service.key)}
                      disabled={isDisconnectPending}
                    >
                      연결 해제
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => void handleConnect(service.key)}
                      disabled={isConnectPending}
                    >
                      연결 시작
                    </Button>
                  )}
                </Box>
              );
            })}
          </SimpleGrid>
        )}
      </Box>
    </Box>
  );
}
