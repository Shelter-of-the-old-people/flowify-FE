import { type SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};

export const SeBoardIcon = ({ size = 24, style, ...props }: Props) => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ height: "auto", width: size, ...style }}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="44" height="44" x="2" y="2" fill="#0F172A" rx="6" />
      <rect
        width="42"
        height="42"
        x="3"
        y="3"
        fill="none"
        rx="5"
        stroke="#38BDF8"
        strokeWidth="2"
      />
      <text
        fill="#38BDF8"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="25"
        fontWeight="600"
        letterSpacing="-2"
        x="8"
        y="32"
      >
        SE
      </text>
    </svg>
  );
};
