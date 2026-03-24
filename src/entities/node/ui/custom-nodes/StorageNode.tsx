import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData, StorageNodeConfig } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const StorageNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as StorageNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.service ?? "서비스 미설정"}</Text>
      <Text>{config.action ?? "동작 미설정"}</Text>
    </BaseNode>
  );
};
