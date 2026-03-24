import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData, LLMNodeConfig } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const LLMNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as LLMNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.model ?? "모델 미선택"}</Text>
      <Text>{config.prompt || "프롬프트 미입력"}</Text>
    </BaseNode>
  );
};
