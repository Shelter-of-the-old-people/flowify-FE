import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const OutputFormatNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = getTypedConfig("output-format", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.format ? config.format.toUpperCase() : "형식 미설정"}</Text>
    </BaseNode>
  );
};
