import { type SVGProps } from "react";

import { getServiceBrandIconStyle } from "./serviceBrandIconStyle";

type Props = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
};

export const GmailIcon = ({ size = 24, style, ...props }: Props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      style={getServiceBrandIconStyle(size, style)}
      viewBox="0 0 60 45"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M13.6364 45V21.824L6.44695 15.2485L0 11.5995V40.91C0 43.1731 1.83398 45 4.09102 45H13.6364Z"
        fill="#4285F4"
      />
      <path
        d="M46.3636 45H55.909C58.1728 45 60 43.1663 60 40.91V11.5997L52.6978 15.7792L46.3636 21.824V45Z"
        fill="#34A853"
      />
      <path
        d="M13.6364 21.824L12.6581 12.7685L13.6364 4.10143L30 16.371L46.3636 4.10143L47.4579 12.3005L46.3636 21.824L30 34.0936L13.6364 21.824Z"
        fill="#EA4335"
      />
      <path
        d="M46.3636 4.10143L46.3636 21.824L60 11.5997V6.14629C60 1.08862 54.225 -1.79461 50.182 1.23858L46.3636 4.10143Z"
        fill="#FBBC04"
      />
      <path
        d="M0 11.5995L13.6364 21.824V4.10143L9.81797 1.23862C5.76797 -1.79481 0 1.08866 0 6.14609V11.5995Z"
        fill="#C5221F"
      />
    </svg>
  );
};
