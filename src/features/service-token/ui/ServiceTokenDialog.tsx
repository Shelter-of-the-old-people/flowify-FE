import { useState } from "react";

import { Box, Button, Dialog, Input, Portal, Text } from "@chakra-ui/react";

import { type ManualTokenSupportedService } from "@/entities/oauth-token";

type ServiceTokenDialogProps = {
  open: boolean;
  serviceKey: ManualTokenSupportedService | null;
  serviceLabel: string;
  isConnected: boolean;
  isPending: boolean;
  errorMessage: string | null;
  maskedHint: string | null;
  updatedAt: string | null;
  onClose: () => void;
  onHelp: () => void;
  onSubmit: (accessToken: string) => void;
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

export const ServiceTokenDialog = ({
  open,
  serviceKey,
  serviceLabel,
  isConnected,
  isPending,
  errorMessage,
  maskedHint,
  updatedAt,
  onClose,
  onHelp,
  onSubmit,
}: ServiceTokenDialogProps) => {
  const [accessToken, setAccessToken] = useState("");

  const submitDisabled = !serviceKey || !accessToken.trim() || isPending;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open && !isPending) {
          onClose();
        }
      }}
      placement="center"
      motionPreset="scale"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxWidth="520px"
            bg="bg.surface"
            borderRadius="2xl"
            fontFamily="'Pretendard Variable', sans-serif"
          >
            <Dialog.Header pb={3}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                {serviceLabel} {isConnected ? "토큰 갱신" : "토큰 입력"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={5}>
              <Text fontSize="sm" color="text.secondary" mb={4}>
                외부에서 발급한 토큰을 직접 저장합니다. 저장된 토큰 원문은 다시
                보여주지 않습니다.
              </Text>

              <Box
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="xl"
                px={4}
                py={3}
                mb={4}
              >
                <Text fontSize="xs" color="gray.500">
                  현재 저장된 토큰
                </Text>
                <Text fontSize="sm" fontWeight="semibold" mt={1}>
                  {maskedHint ?? "아직 저장된 토큰이 없습니다."}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  최근 저장 {formatDateTime(updatedAt)}
                </Text>
              </Box>

              <Box mb={4}>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  새 토큰 입력
                </Text>
                <Input
                  autoComplete="off"
                  placeholder="토큰 값을 붙여 넣어 주세요."
                  type="password"
                  value={accessToken}
                  onChange={(event) => setAccessToken(event.target.value)}
                />
                <Text fontSize="xs" color="gray.500" mt={2}>
                  검증이 끝난 뒤에만 저장됩니다.
                </Text>
              </Box>

              <Button
                alignSelf="flex-start"
                size="sm"
                variant="outline"
                onClick={onHelp}
              >
                발급 링크 / 가이드 보기
              </Button>

              {errorMessage ? (
                <Text color="red.500" fontSize="sm" mt={4}>
                  {errorMessage}
                </Text>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isPending}
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onSubmit(accessToken.trim())}
                disabled={submitDisabled}
                loading={isPending}
                loadingText={isConnected ? "갱신 중" : "저장 중"}
              >
                {isConnected ? "토큰 갱신" : "토큰 저장"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
