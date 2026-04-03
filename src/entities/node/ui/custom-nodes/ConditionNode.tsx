import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const ConditionNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = getTypedConfig("condition", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>
        {config.field ?? "대상 미설정"} {config.operator ?? ""}{" "}
        {config.value ?? ""}
      </Text>
    </BaseNode>
  );
};
