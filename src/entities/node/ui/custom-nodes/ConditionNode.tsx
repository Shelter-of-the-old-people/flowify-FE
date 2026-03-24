import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { ConditionNodeConfig, FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const ConditionNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as ConditionNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>
        {config.field ?? "필드 미설정"} {config.operator ?? ""}{" "}
        {config.value ?? ""}
      </Text>
    </BaseNode>
  );
};
