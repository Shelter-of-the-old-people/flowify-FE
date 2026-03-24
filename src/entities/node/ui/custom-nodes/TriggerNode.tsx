import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData, TriggerNodeConfig } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const TriggerNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as TriggerNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.triggerType ?? "트리거 타입 미설정"}</Text>
      <Text>{config.schedule ?? config.eventType ?? "일정 미설정"}</Text>
    </BaseNode>
  );
};
