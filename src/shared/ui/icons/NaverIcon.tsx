import { type SVGProps } from "react";

import { getServiceBrandIconStyle } from "./serviceBrandIconStyle";

type Props = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};

export const NaverIcon = ({ size = 24, style, ...props }: Props) => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      style={getServiceBrandIconStyle(size, style)}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M0 0H120V120H0V0Z" fill="#03CF5D" />
      <path
        d="M67.6917 61.5212L51.6761 38.4H38.4V81.6H52.3083V58.4789L68.3239 81.6H81.6V38.4H67.6917V61.5212Z"
        fill="white"
      />
    </svg>
  );
};
