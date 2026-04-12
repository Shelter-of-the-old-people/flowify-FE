import { useState } from "react";

import {
  Box,
  Button,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FcGoogle } from "react-icons/fc";

import { buildGoogleLoginStartUrl } from "@/shared";

const LOGIN_CARD_BORDER_COLOR = "#f2f2f2";
const LOGIN_CARD_SHADOW = "0 4px 4px rgba(0, 0, 0, 0.25)";
const LOGIN_BUTTON_BORDER_COLOR = "#efefef";
const LOGIN_ERROR_MESSAGE = "구글 로그인 설정 확인이 필요합니다.";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleGoogleLogin = () => {
    setErrorMessage(null);
    setIsPending(true);

    try {
      window.location.href = buildGoogleLoginStartUrl();
    } catch {
      setErrorMessage(LOGIN_ERROR_MESSAGE);
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
      px={{ base: 6, md: 8 }}
    >
      <VStack
        gap={{ base: 10, md: 12 }}
        maxW="437px"
        w="full"
        align="stretch"
      >
        <Text
          textAlign="center"
          fontSize={{ base: "40px", md: "48px" }}
          fontWeight="medium"
          lineHeight="1"
          color="text.primary"
        >
          Flowify
        </Text>

        <VStack
          gap="10px"
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
            bg="bg.surface"
            border="1px solid"
            borderColor={LOGIN_BUTTON_BORDER_COLOR}
            borderRadius="0"
            color="text.primary"
            fontSize="16px"
            fontWeight="semibold"
            gap="10px"
            h="auto"
            minH="auto"
            w="full"
            px={{ base: "32px", md: "64px" }}
            py="10px"
            onClick={handleGoogleLogin}
            disabled={isPending}
            _hover={{ bg: "neutral.50" }}
            _active={{ bg: "neutral.100" }}
          >
            {isPending ? (
              <>
                <Spinner size="sm" color="text.primary" />
                구글 로그인 이동 중...
              </>
            ) : (
              <>
                <FcGoogle size={24} />
                Google 로그인
              </>
            )}
          </Button>

          {errorMessage ? (
            <Text fontSize="sm" color="status.error" textAlign="center">
              {errorMessage}
            </Text>
          ) : null}
        </VStack>
      </VStack>
    </Box>
  );
}
