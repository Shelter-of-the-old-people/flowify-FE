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
            border="1px solid"
            borderColor="#5865F2"
            boxShadow="0 6px 12px rgba(88, 101, 242, 0.18)"
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
            border="1px solid"
            borderColor="#03CF5D"
            boxShadow="0 6px 12px rgba(3, 207, 93, 0.18)"
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
            boxShadow="0 6px 12px rgba(56, 189, 248, 0.18)"
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
            border="1px solid"
            borderColor="border.default"
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
