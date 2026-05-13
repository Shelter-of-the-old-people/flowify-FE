import { type Node, type NodeProps } from "@xyflow/react";

import { type FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const StorageNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) => {
  return <BaseNode id={id} data={data} selected={selected ?? false} />;
};
