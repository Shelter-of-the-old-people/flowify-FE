import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData, LoopNodeConfig } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const LoopNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as LoopNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.targetField ?? "반복 대상 미설정"}</Text>
      <Text>최대 {config.maxIterations}회</Text>
    </BaseNode>
  );
};
