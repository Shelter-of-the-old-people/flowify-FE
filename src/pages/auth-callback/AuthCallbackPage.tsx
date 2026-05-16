import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { Box, Button, Spinner, Text, VStack } from "@chakra-ui/react";

import { authApi } from "@/entities";
import {
  clearWorkflowNodeStatusCaches,
  consumePendingOAuthNodeStatusRefresh,
} from "@/features/workflow-editor";
import {
  ROUTE_PATHS,
  clearAuthSession,
  consumeOAuthConnectReturnPath,
  storeAuthUser,
  storeTokens,
} from "@/shared";

import {
  authCallbackFallbackMessage,
  resolveAuthExchangeError,
  resolveRedirectError,
} from "./model/auth-callback-error";

type CallbackState = "pending" | "error";

export default function AuthCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [callbackState, setCallbackState] = useState<CallbackState>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const exchangeCode = searchParams.get("exchange_code");
    const connected = searchParams.get("connected");
    const service = searchParams.get("service");

    let isMounted = true;

    const finalizeLogin = async () => {
      if (service) {
        const refreshContext = consumePendingOAuthNodeStatusRefresh();

        if (connected === "true") {
          const returnPath = consumeOAuthConnectReturnPath();

          if (refreshContext) {
            clearWorkflowNodeStatusCaches(refreshContext);
          }

          navigate(returnPath, { replace: true });
          return;
        }

        if (isMounted) {
          setCallbackState("error");
          setErrorMessage(resolveRedirectError(searchParams));
        }
        return;
      }

      const redirectErrorMessage = resolveRedirectError(searchParams);
      if (redirectErrorMessage) {
        clearAuthSession();

        if (isMounted) {
          setCallbackState("error");
          setErrorMessage(redirectErrorMessage);
        }
        return;
      }

      if (!exchangeCode) {
        return;
      }

      try {
        const result = await authApi.exchange(exchangeCode);
        if (!isMounted) {
          return;
        }

        const { accessToken, refreshToken, user } = result;
        storeTokens(accessToken, refreshToken);
        storeAuthUser(user);
        navigate(ROUTE_PATHS.WORKFLOWS, { replace: true });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        clearAuthSession();
        setCallbackState("error");
        setErrorMessage(resolveAuthExchangeError(error));
      }
    };

    void finalizeLogin();

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
            {errorMessage ?? authCallbackFallbackMessage}
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
