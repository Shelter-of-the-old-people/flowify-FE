import { Flex, Icon } from "@chakra-ui/react";

import { type ServiceBadgeKey } from "../utils";

import { getServiceIconMeta } from "./service-icon-registry";

type Props = {
  type: ServiceBadgeKey;
};

const BRAND_BADGE_SIZE: Partial<Record<ServiceBadgeKey, number>> = {
  discord: 22,
  "google-sheets": 22,
  "naver-news": 22,
  notion: 29,
  seboard: 30,
};

export const ServiceBadge = ({ type }: Props) => {
  const meta = getServiceIconMeta(type);
  const fallbackIcon = meta.fallbackIcon;
  const { BrandIcon } = meta;

  const content = (() => {
    switch (type) {
      case "discord":
        return (
          <Flex
            boxSize="30px"
            align="center"
            justify="center"
            bg="bg.surface"
            borderRadius="lg"
          >
            {BrandIcon ? <BrandIcon size={BRAND_BADGE_SIZE[type]} /> : null}
          </Flex>
        );
      case "naver-news":
        return (
          <Flex
            boxSize="30px"
            align="center"
            justify="center"
            bg="bg.surface"
            borderRadius="lg"
            overflow="hidden"
          >
            {BrandIcon ? <BrandIcon size={BRAND_BADGE_SIZE[type]} /> : null}
          </Flex>
        );
      case "seboard":
        return (
          <Flex
            boxSize="30px"
            align="center"
            justify="center"
            borderRadius="lg"
            overflow="hidden"
          >
            {BrandIcon ? <BrandIcon size={BRAND_BADGE_SIZE[type]} /> : null}
          </Flex>
        );
      default:
        if (BrandIcon) {
          return (
            <Flex boxSize="30px" align="center" justify="center">
              <BrandIcon size={BRAND_BADGE_SIZE[type] ?? 30} />
            </Flex>
          );
        }

        return (
          <Flex
            boxSize="30px"
            align="center"
            justify="center"
            bg="bg.overlay"
            borderRadius="lg"
          >
            <Icon as={fallbackIcon} boxSize={4.5} color="text.primary" />
          </Flex>
        );
    }
  })();

  return (
    <Flex boxSize="38px" align="center" justify="center" flexShrink={0}>
      {content}
    </Flex>
  );
};
