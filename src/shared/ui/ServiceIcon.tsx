import { type IconType } from "react-icons";

import { Icon } from "@chakra-ui/react";

import { getServiceIconMetaFromService } from "./service-icon-registry";

type Props = {
  color?: string;
  fallbackIcon?: IconType | null;
  serviceKey?: string | null;
  size?: number | string;
  sourceMode?: string | null;
};

const toCssSize = (size: number | string) =>
  typeof size === "number" ? `${size}px` : size;

export const ServiceIcon = ({
  color = "text.primary",
  fallbackIcon,
  serviceKey,
  size = 24,
  sourceMode,
}: Props) => {
  if (!serviceKey) {
    return fallbackIcon ? (
      <Icon as={fallbackIcon} boxSize={toCssSize(size)} color={color} />
    ) : null;
  }

  const meta = getServiceIconMetaFromService(serviceKey, sourceMode);
  const { BrandIcon } = meta;

  if (BrandIcon) {
    return <BrandIcon size={size} />;
  }

  const IconComponent =
    meta.key === "unknown" ? fallbackIcon : meta.fallbackIcon;

  if (!IconComponent) {
    return null;
  }

  return <Icon as={IconComponent} boxSize={toCssSize(size)} color={color} />;
};
