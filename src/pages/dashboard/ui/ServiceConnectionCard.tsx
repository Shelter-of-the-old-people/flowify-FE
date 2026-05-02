import { MdCancel } from "react-icons/md";

import { Flex, IconButton, Spinner, Text, VStack } from "@chakra-ui/react";

import { ServiceBadge } from "@/shared";

import { type DashboardServiceCard } from "../model";

type Props = {
  disconnectDisabled?: boolean;
  isDisconnecting?: boolean;
  onDisconnect?: (serviceKey: string) => void;
  service: DashboardServiceCard;
};

export const ServiceConnectionCard = ({
  disconnectDisabled = false,
  isDisconnecting = false,
  onDisconnect,
  service,
}: Props) => {
  return (
    <Flex
      w={{ base: "full", md: "252px" }}
      align="center"
      justify="space-between"
      gap={3}
      p={4}
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="10px"
    >
      <Flex align="center" gap={3} minW={0} flex="1">
        <ServiceBadge type={service.badgeKey} />

        <VStack align="stretch" gap={0.5} minW={0}>
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="text.primary"
            lineClamp={1}
          >
            {service.label}
          </Text>
          <Text fontSize="xs" color="text.secondary" lineClamp={1}>
            {service.statusLabel}
          </Text>
        </VStack>
      </Flex>

      {onDisconnect && service.serviceKey ? (
        <IconButton
          aria-label={`${service.label} 연결 해제`}
          alignSelf="flex-start"
          disabled={disconnectDisabled}
          size="xs"
          variant="ghost"
          onClick={() => onDisconnect(service.serviceKey!)}
        >
          {isDisconnecting ? <Spinner size="xs" /> : <MdCancel />}
        </IconButton>
      ) : null}
    </Flex>
  );
};
