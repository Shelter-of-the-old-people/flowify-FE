import { type CSSProperties } from "react";

export const getServiceBrandIconStyle = (
  size: number | string,
  style?: CSSProperties,
): CSSProperties => ({
  display: "block",
  height: size,
  maxHeight: "100%",
  maxWidth: "100%",
  width: size,
  ...style,
});
