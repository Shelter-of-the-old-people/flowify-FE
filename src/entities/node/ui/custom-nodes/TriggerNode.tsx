import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const TriggerNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = getTypedConfig("trigger", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.triggerType ?? "시작 조건 미설정"}</Text>
      <Text>{config.schedule ?? config.eventType ?? "일정 미설정"}</Text>
    </BaseNode>
  );
};
