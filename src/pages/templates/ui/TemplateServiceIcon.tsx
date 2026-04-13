import { Flex, Image } from "@chakra-ui/react";

import { ServiceBadge, getServiceBadgeKeyFromService } from "@/shared";

type Props = {
  icon?: string | null;
  requiredServices: string[];
};

const isAssetUrl = (value: string) =>
  /^(https?:)?\/\//.test(value) ||
  value.startsWith("/") ||
  value.startsWith("data:");

const getIconKey = (
  icon: string | null | undefined,
  requiredServices: string[],
) => {
  if (icon && !isAssetUrl(icon)) {
    return getServiceBadgeKeyFromService(icon);
  }

  return getServiceBadgeKeyFromService(requiredServices[0]);
};

export const TemplateServiceIcon = ({ icon, requiredServices }: Props) => {
  if (icon && isAssetUrl(icon)) {
    return (
      <Flex boxSize="38px" align="center" justify="center" flexShrink={0}>
        <Image
          src={icon}
          alt=""
          boxSize="30px"
          objectFit="contain"
          borderRadius="lg"
        />
      </Flex>
    );
  }

  return <ServiceBadge type={getIconKey(icon, requiredServices)} />;
};
