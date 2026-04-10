import { useState } from "react";

import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

import { createGoogleOAuthUrl } from "@/shared";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setIsPending(true);

    try {
      const googleOAuthUrl = createGoogleOAuthUrl();
      window.location.href = googleOAuthUrl;
    } catch {
      setErrorMessage("구글 로그인 설정 확인이 필요합니다.");
      setIsPending(false);
    }
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
      px={6}
    >
      <VStack
        gap={5}
        bg="white"
        borderRadius="24px"
        boxShadow="0 20px 60px rgba(15, 23, 42, 0.08)"
        px={{ base: 6, md: 10 }}
        py={{ base: 8, md: 10 }}
        maxW="440px"
        w="full"
        align="stretch"
      >
        <VStack gap={2} align="stretch">
          <Text fontSize="sm" fontWeight="semibold" color="gray.500">
            Flowify
          </Text>
          <Heading size="lg">로그인</Heading>
          <Text color="gray.600">
            구글 계정으로 로그인 후 워크플로우 관리 화면 진입이 가능합니다.
          </Text>
        </VStack>

        <Button
          bg="gray.900"
          color="white"
          size="lg"
          onClick={handleGoogleLogin}
          disabled={isPending}
          _hover={{ bg: "gray.800" }}
        >
          {isPending ? "구글 로그인 이동 중..." : "구글로 로그인"}
        </Button>

        {errorMessage ? (
          <Text fontSize="sm" color="red.500">
            {errorMessage}
          </Text>
        ) : null}
      </VStack>
    </Box>
  );
}
