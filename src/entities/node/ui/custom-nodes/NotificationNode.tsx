import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData, NotificationNodeConfig } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const NotificationNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as NotificationNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.channel ?? "채널 미설정"}</Text>
      <Text>{config.recipient ?? "수신자 미설정"}</Text>
    </BaseNode>
  );
};
