import { Box, Button, Text } from "@chakra-ui/react";

import { type OAuthConnectionUiState } from "@/entities/oauth-token";

type Props = {
  authState: OAuthConnectionUiState;
  isConnecting: boolean;
  onConnect: () => void;
};

const TONE_STYLES: Record<
  OAuthConnectionUiState["tone"],
  { bg: string; borderColor: string; color: string }
> = {
  error: {
    bg: "red.50",
    borderColor: "red.100",
    color: "red.600",
  },
  neutral: {
    bg: "gray.50",
    borderColor: "gray.100",
    color: "text.secondary",
  },
  success: {
    bg: "green.50",
    borderColor: "green.100",
    color: "green.600",
  },
  warning: {
    bg: "orange.50",
    borderColor: "orange.100",
    color: "orange.600",
  },
};

export const AuthPrompt = ({ authState, isConnecting, onConnect }: Props) => {
  const toneStyle = TONE_STYLES[authState.tone];

  return (
    <Box
      bg={toneStyle.bg}
      border="1px solid"
      borderColor={toneStyle.borderColor}
      borderRadius="2xl"
      display="flex"
      flexDirection="column"
      gap={3}
      px={4}
      py={4}
    >
      <Box>
        <Text color={toneStyle.color} fontSize="sm" fontWeight="semibold">
          {authState.label}
        </Text>
        <Text color="text.secondary" fontSize="sm" mt={1}>
          {authState.description}
        </Text>
      </Box>

      {authState.canStartConnect ? (
        <Button
          alignSelf="flex-start"
          loading={isConnecting}
          size="sm"
          variant="outline"
          onClick={onConnect}
        >
          {authState.actionLabel}
        </Button>
      ) : null}
    </Box>
  );
};
