import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData, OutputFormatNodeConfig } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const OutputFormatNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as OutputFormatNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.format ? config.format.toUpperCase() : "포맷 미설정"}</Text>
    </BaseNode>
  );
};
