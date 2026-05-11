import { type MouseEvent } from "react";
import { MdClose } from "react-icons/md";

import { Flex, IconButton, Spinner, Text, VStack } from "@chakra-ui/react";

import { ServiceBadge } from "@/shared";

import { type DashboardServiceCard } from "../model";

type Props = {
  service: DashboardServiceCard;
  isPending?: boolean;
  onAction?: () => void;
};

export const ServiceConnectionCard = ({
  service,
  isPending = false,
  onAction,
}: Props) => {
  const isConnectCard = service.actionKind === "connect";
  const isActionDisabled = isPending || service.actionDisabled === true;

  const handleDisconnectClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isActionDisabled) {
      return;
    }
    onAction?.();
  };

  return (
    <Flex
      as={isConnectCard ? "button" : "div"}
      w={{ base: "full", md: "252px" }}
      align="center"
      justify="space-between"
      gap={3}
      p={4}
      bg="bg.surface"
      border="1px solid"
      borderColor="border.default"
      borderRadius="10px"
      cursor={isConnectCard ? "pointer" : "default"}
      transition="transform 180ms ease, box-shadow 180ms ease"
      _hover={
        isConnectCard && !isActionDisabled
          ? {
              transform: "translateY(-1px)",
              boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
            }
          : undefined
      }
      _disabled={{
        cursor: "not-allowed",
        opacity: 0.7,
      }}
      aria-disabled={isConnectCard ? isActionDisabled : undefined}
      title={service.disabledReason}
      onClick={isConnectCard && !isActionDisabled ? onAction : undefined}
    >
      <Flex align="center" gap={3} minW={0} flex={1}>
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

      {isConnectCard ? (
        isPending ? (
          <Spinner size="sm" flexShrink={0} />
        ) : null
      ) : (
        <IconButton
          aria-label={service.actionLabel}
          variant="ghost"
          size="sm"
          flexShrink={0}
          disabled={isActionDisabled}
          onClick={handleDisconnectClick}
        >
          {isPending ? <Spinner size="xs" /> : <MdClose />}
        </IconButton>
      )}
    </Flex>
  );
};
