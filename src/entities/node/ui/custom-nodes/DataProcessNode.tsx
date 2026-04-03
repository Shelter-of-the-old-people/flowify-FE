import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
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
  const config = getTypedConfig("data-process", data.config);
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text>
        {config.operation ? OPERATION_LABEL[config.operation] : "동작 미설정"}
      </Text>
      <Text>{config.field ?? "대상 미설정"}</Text>
    </BaseNode>
  );
};
