import { Box, Button, Dialog, Portal, Text, VStack } from "@chakra-ui/react";

import { type ManualTokenSupportedService } from "@/entities/oauth-token";

import { getServiceTokenHelpContent } from "../model";

type ServiceTokenHelpDialogProps = {
  open: boolean;
  serviceKey: ManualTokenSupportedService | null;
  onClose: () => void;
};

export const ServiceTokenHelpDialog = ({
  open,
  serviceKey,
  onClose,
}: ServiceTokenHelpDialogProps) => {
  const content = serviceKey ? getServiceTokenHelpContent(serviceKey) : null;

  if (!content) {
    return null;
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) {
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
            maxWidth="560px"
            bg="bg.surface"
            borderRadius="2xl"
            fontFamily="'Pretendard Variable', sans-serif"
          >
            <Dialog.Header pb={3}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                {content.title}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={5}>
              <Text fontSize="sm" color="text.secondary" mb={4}>
                {content.summary}
              </Text>

              <Box
                bg="gray.50"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="xl"
                px={4}
                py={3}
                mb={5}
              >
                <Text fontSize="xs" color="gray.500">
                  필요한 토큰
                </Text>
                <Text fontSize="sm" fontWeight="semibold" mt={1}>
                  {content.tokenName}
                </Text>
              </Box>

              <VStack align="stretch" gap={5}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    바로가기
                  </Text>
                  <VStack align="stretch" gap={3}>
                    {content.quickLinks.map((quickLink) => (
                      <Box
                        key={quickLink.label}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="xl"
                        px={3}
                        py={3}
                      >
                        <Button
                          asChild
                          size="sm"
                          variant={
                            quickLink.emphasis === "primary"
                              ? "solid"
                              : "outline"
                          }
                          width="full"
                          justifyContent="flex-start"
                        >
                          <a
                            href={quickLink.href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {quickLink.label}
                          </a>
                        </Button>
                        <Text fontSize="xs" color="gray.500" mt={2}>
                          {quickLink.description}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    발급 순서
                  </Text>
                  <VStack align="stretch" gap={2}>
                    {content.steps.map((step, index) => (
                      <Text key={step} fontSize="sm" color="text.secondary">
                        {index + 1}. {step}
                      </Text>
                    ))}
                  </VStack>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    권한 확인
                  </Text>
                  <VStack align="stretch" gap={2}>
                    {content.permissions.map((permission) => (
                      <Text
                        key={permission}
                        fontSize="sm"
                        color="text.secondary"
                      >
                        - {permission}
                      </Text>
                    ))}
                  </VStack>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    보안 주의
                  </Text>
                  <VStack align="stretch" gap={2}>
                    {content.warnings.map((warning) => (
                      <Text key={warning} fontSize="sm" color="text.secondary">
                        - {warning}
                      </Text>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button type="button" size="sm" onClick={onClose}>
                닫기
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
