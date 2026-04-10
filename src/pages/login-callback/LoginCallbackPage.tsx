import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { Box, Button, Spinner, Text, VStack } from "@chakra-ui/react";

import {
  ROUTE_PATHS,
  authApi,
  clearAuthSession,
  clearGoogleOAuthState,
  getStoredGoogleOAuthState,
  storeAuthUser,
  storeTokens,
} from "@/shared";

type CallbackState = "pending" | "error";

const callbackErrorMessages = {
  missingCode: "인증 코드 확인이 필요합니다.",
  invalidState: "로그인 검증 확인이 필요합니다.",
  exchangeFailed: "로그인 처리 중 오류가 발생했습니다.",
} as const;

export default function LoginCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [callbackState, setCallbackState] = useState<CallbackState>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = getStoredGoogleOAuthState();

    let isMounted = true;

    const exchangeCode = async () => {
      clearGoogleOAuthState();

      if (!code) {
        clearAuthSession();

        if (isMounted) {
          setCallbackState("error");
          setErrorMessage(callbackErrorMessages.missingCode);
        }
        return;
      }

      if (!state || !storedState || state !== storedState) {
        clearAuthSession();

        if (isMounted) {
          setCallbackState("error");
          setErrorMessage(callbackErrorMessages.invalidState);
        }
        return;
      }

      try {
        const response = await authApi.googleCallback(code);
        if (!isMounted) {
          return;
        }

        const { accessToken, refreshToken, user } = response.data.data;
        storeTokens(accessToken, refreshToken);
        storeAuthUser(user);
        navigate(ROUTE_PATHS.WORKFLOWS, { replace: true });
      } catch {
        if (!isMounted) {
          return;
        }

        clearAuthSession();
        setCallbackState("error");
        setErrorMessage(callbackErrorMessages.exchangeFailed);
      }
    };

    void exchangeCode();

    return () => {
      isMounted = false;
    };
  }, [location.search, navigate]);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
      px={6}
    >
      {callbackState === "pending" ? (
        <VStack
          gap={4}
          bg="white"
          borderRadius="24px"
          boxShadow="0 20px 60px rgba(15, 23, 42, 0.08)"
          px={8}
          py={10}
        >
          <Spinner size="lg" />
          <Text fontSize="lg" fontWeight="semibold">
            로그인 처리 중입니다.
          </Text>
          <Text color="gray.600">잠시만 기다려 주세요.</Text>
        </VStack>
      ) : (
        <VStack
          gap={4}
          bg="white"
          borderRadius="24px"
          boxShadow="0 20px 60px rgba(15, 23, 42, 0.08)"
          px={8}
          py={10}
          maxW="420px"
          textAlign="center"
        >
          <Text fontSize="lg" fontWeight="semibold">
            로그인 실패
          </Text>
          <Text color="gray.600">
            {errorMessage ?? callbackErrorMessages.exchangeFailed}
          </Text>
          <Button
            bg="gray.900"
            color="white"
            onClick={() => navigate(ROUTE_PATHS.LOGIN, { replace: true })}
            _hover={{ bg: "gray.800" }}
          >
            로그인 화면 이동
          </Button>
        </VStack>
      )}
    </Box>
  );
}
