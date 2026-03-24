import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { DataProcessNodeConfig, FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

const OPERATION_LABEL: Record<
  NonNullable<DataProcessNodeConfig["operation"]>,
  string
> = {
  transform: "변환",
  aggregate: "집계",
  sort: "정렬",
  classify: "분류",
};

export const DataProcessNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as DataProcessNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>
        {config.operation ? OPERATION_LABEL[config.operation] : "동작 미설정"}
      </Text>
      <Text>{config.field ?? "필드 미설정"}</Text>
    </BaseNode>
  );
};
