import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const LLMNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = getTypedConfig("llm", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.model ?? "모델 미설정"}</Text>
      <Text>{config.prompt || "지시사항 미설정"}</Text>
    </BaseNode>
  );
};
