import { Box, HStack, Text, VStack } from "@chakra-ui/react";

import { ServiceBadge, getServiceBadgeKeyFromService } from "@/shared";

type Props = {
  services: string[];
};

export const TemplateRequiredServices = ({ services }: Props) => {
  if (services.length === 0) {
    return (
      <Text fontSize="sm" color="text.secondary">
        연결이 필요한 서비스가 아직 정의되지 않았습니다.
      </Text>
    );
  }

  return (
    <HStack align="stretch" gap={3} wrap="wrap">
      {services.map((service) => (
        <Box
          key={service}
          px={3}
          py={2.5}
          borderRadius="18px"
          bg="bg.surface"
          border="1px solid"
          borderColor="border.default"
          boxShadow="0 6px 18px rgba(15, 23, 42, 0.04)"
        >
          <HStack gap={2.5}>
            <ServiceBadge type={getServiceBadgeKeyFromService(service)} />
            <VStack align="stretch" gap={0}>
              <Text fontSize="xs" fontWeight="medium" color="text.secondary">
                필요 서비스
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="text.primary">
                {service}
              </Text>
            </VStack>
          </HStack>
        </Box>
      ))}
    </HStack>
  );
};
