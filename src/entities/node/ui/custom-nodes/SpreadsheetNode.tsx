import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const SpreadsheetNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = getTypedConfig("spreadsheet", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>{config.sheetName ?? "시트 미설정"}</Text>
      <Text>{config.action ?? "동작 미설정"}</Text>
    </BaseNode>
  );
};
