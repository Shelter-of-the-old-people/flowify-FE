import { type SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};

export const GoogleSheetsIcon = ({ size = 24, style, ...props }: Props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      style={{ height: "auto", width: size, ...style }}
      viewBox="0 0 64 88"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M42 0L64 22L53 24L42 22L40 11L42 0Z" fill="#188038" />
      <path
        d="M42 22V0H6C2.685 0 0 2.685 0 6V82C0 85.315 2.685 88 6 88H58C61.315 88 64 85.315 64 82V22H42Z"
        fill="#34A853"
      />
      <path
        d="M12 34V63H52V34H12ZM29.5 58H17V51H29.5V58ZM29.5 46H17V39H29.5V46ZM47 58H34.5V51H47V58ZM47 46H34.5V39H47V46Z"
        fill="white"
      />
    </svg>
  );
};
