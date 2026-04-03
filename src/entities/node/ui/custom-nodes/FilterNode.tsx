import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const FilterNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = getTypedConfig("filter", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.field ?? "대상 미설정"}</Text>
      <Text>{config.operator ?? "조건 미설정"}</Text>
    </BaseNode>
  );
};
