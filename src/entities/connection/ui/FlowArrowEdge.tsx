import type { CSSProperties } from "react";

import { Box, Text } from "@chakra-ui/react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

import type { FlowEdgeData } from "../model";

const ARROW_WIDTH = 40;
const ARROW_HEIGHT = 18;

const getArrowAngle = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) => (Math.atan2(targetY - sourceY, targetX - sourceX) * 180) / Math.PI;

const getLabelOffsetY = (angle: number) => {
  if (Math.abs(angle) < 20) {
    return -26;
  }

  return angle > 0 ? -22 : -30;
};

const arrowBaseStyle: CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
};

const FlowArrowIcon = () => (
  <svg
    fill="none"
    height={ARROW_HEIGHT}
    viewBox={`0 0 ${ARROW_WIDTH} ${ARROW_HEIGHT}`}
    width={ARROW_WIDTH}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2 9H33" stroke="#737373" strokeLinecap="round" strokeWidth="3" />
    <path
      d="M25 2L36 9L25 16"
      stroke="#737373"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="3"
    />
  </svg>
);

export const FlowArrowEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const typedData = (data ?? null) as FlowEdgeData | null;
  const arrowAngle = getArrowAngle(sourceX, sourceY, targetX, targetY);
  const labelOffsetY = getLabelOffsetY(arrowAngle);

  return (
    <>
      <BaseEdge
        id={id}
        interactionWidth={24}
        path={edgePath}
        style={{
          opacity: 0,
          stroke: "transparent",
          strokeWidth: 2,
          ...style,
        }}
      />

      <EdgeLabelRenderer>
        {typedData?.label ? (
          <Box
            className="nopan nodrag"
            left={0}
            style={{
              ...arrowBaseStyle,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${
                labelY + labelOffsetY
              }px)`,
            }}
            top={0}
          >
            <Text
              color="gray.600"
              fontSize="16px"
              fontWeight="semibold"
              whiteSpace="nowrap"
            >
              {typedData.label}
            </Text>
          </Box>
        ) : null}

        <Box
          className="nopan nodrag"
          left={0}
          style={{
            ...arrowBaseStyle,
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px) rotate(${arrowAngle}deg)`,
            transformOrigin: "center",
          }}
          top={0}
        >
          <FlowArrowIcon />
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};
