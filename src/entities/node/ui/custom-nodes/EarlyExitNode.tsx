import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { EarlyExitNodeConfig, FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const EarlyExitNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as EarlyExitNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {config.condition ?? "조건 미설정"}
      </Text>
    </BaseNode>
  );
};
