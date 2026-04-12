import { useState } from "react";

import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

import { buildGoogleLoginStartUrl } from "@/shared";

const LOGIN_CARD_BORDER_COLOR = "#f2f2f2";
const LOGIN_CARD_SHADOW = "0 4px 4px rgba(0, 0, 0, 0.25)";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setIsPending(true);

    try {
      window.location.href = buildGoogleLoginStartUrl();
    } catch {
      setErrorMessage("구글 로그인 설정 확인이 필요합니다.");
      setIsPending(false);
    }
  };

  return (
    <Box
      minH="100dvh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="bg.surface"
      px={6}
    >
      <VStack
        gap={12}
        maxW="437px"
        w="full"
        align="stretch"
      >
        <Text
          textAlign="center"
          fontSize={{ base: "36px", md: "48px" }}
          fontWeight="medium"
          lineHeight="1"
          color="text.primary"
        >
          Flowify
        </Text>

        <VStack
          gap={5}
          bg="bg.surface"
          border="1px solid"
          borderColor={LOGIN_CARD_BORDER_COLOR}
          borderRadius="20px"
          boxShadow={LOGIN_CARD_SHADOW}
          px={{ base: "32px", md: "48px" }}
          py={{ base: "32px", md: "48px" }}
          align="stretch"
        >
          <Heading
            fontSize="24px"
            fontWeight="bold"
            textAlign="center"
            color="text.primary"
          >
            로그인
          </Heading>

          <Button
            bg="gray.900"
            color="white"
            size="lg"
            w="full"
            onClick={handleGoogleLogin}
            disabled={isPending}
            _hover={{ bg: "gray.800" }}
          >
            {isPending ? "구글 로그인 이동 중..." : "구글로 로그인"}
          </Button>

          {errorMessage ? (
            <Text fontSize="sm" color="red.500" textAlign="center">
              {errorMessage}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </Box>
  );
}
