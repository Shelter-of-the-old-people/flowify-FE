import { type IconType } from "react-icons";

import { Icon } from "@chakra-ui/react";

import { DiscordIcon, NaverIcon, SeBoardIcon } from "./icons";

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
  if (serviceKey === "discord") {
    return <DiscordIcon size={size} />;
  }

  if (serviceKey === "naver_news") {
    return <NaverIcon size={size} />;
  }

  if (
    serviceKey === "web_news" &&
    (sourceMode === "seboard_posts" || sourceMode === "seboard_new_posts")
  ) {
    return <SeBoardIcon size={size} />;
  }

  if (!fallbackIcon) {
    return null;
  }

  return <Icon as={fallbackIcon} boxSize={toCssSize(size)} color={color} />;
};
