import { Text } from "@chakra-ui/react";
import { type Node, type NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import { type FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const SpreadsheetNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) => {
  const config = getTypedConfig("spreadsheet", data.config);

  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.sheet_name ?? config.sheetName ?? "시트 미설정"}</Text>
      <Text>{config.action ?? config.write_mode ?? "동작 미설정"}</Text>
    </BaseNode>
  );
};
