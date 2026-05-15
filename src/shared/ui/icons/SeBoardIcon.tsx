import { type SVGProps } from "react";

import { getServiceBrandIconStyle } from "./serviceBrandIconStyle";

type Props = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};

export const SeBoardIcon = ({
  color = "#339AF0",
  size = 24,
  style,
  ...props
}: Props) => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      style={getServiceBrandIconStyle(size, { color, ...style })}
      viewBox="0 0 300 300"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="232" height="232" x="34" y="34" fill="white" rx="44" />
      <path
        d="M222,40c21,0,38,17,38,38v144c0,21-17,38-38,38H78c-21,0-38-17-38-38V78c0-21,17-38,38-38H222 M222,28H78 c-27.6,0-50,22.4-50,50v144c0,27.6,22.4,50,50,50h144c27.6,0,50-22.4,50-50V78C272,50.4,249.6,28,222,28L222,28z"
        fill="currentColor"
      />
      <path
        d="M112.5,130.3c17.3,0,30.2,13.8,30.2,32.9c0,18-11.6,31.6-28.6,31.6H66.7v-19.3h41.9c8.3,0,15.1-3.9,15.1-12.3 c0-7.9-6-12.6-13.7-12.6H97.7c-20.8,0-34.3-8.8-34.3-30.4c0-15.4,10.7-29.3,27.1-29.3h43v20.3H98.4c-7.9,0-14.3,1.3-14.3,10 c0,5.1,3.7,9.2,9.6,9.2H112.5z"
        fill="currentColor"
      />
      <path
        d="M182,177.2h51.8v17.6h-71.5V90.9h71.5v17.6H182v25.7h51.8v17.3H182V177.2z"
        fill="currentColor"
      />
    </svg>
  );
};
