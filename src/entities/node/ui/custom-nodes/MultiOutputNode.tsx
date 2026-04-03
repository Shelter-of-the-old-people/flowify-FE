import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const MultiOutputNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = getTypedConfig("multi-output", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>출력 {config.outputCount}개</Text>
    </BaseNode>
  );
};
