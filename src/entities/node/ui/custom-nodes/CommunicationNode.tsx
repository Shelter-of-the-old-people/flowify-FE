import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { CommunicationNodeConfig, FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const CommunicationNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as CommunicationNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.service ?? "서비스 미선택"}</Text>
      <Text>{config.action ?? "동작 미설정"}</Text>
    </BaseNode>
  );
};
