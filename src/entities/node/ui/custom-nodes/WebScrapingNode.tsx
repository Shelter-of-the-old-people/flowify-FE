import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";

import type { FlowNodeData, WebScrapingNodeConfig } from "../../model/types";
import { BaseNode } from "../BaseNode";

export const WebScrapingNode = ({
  id,
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) => {
  const config = data.config as WebScrapingNodeConfig;
  return (
    <BaseNode id={id} data={data} selected={selected}>
      <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {config.targetUrl ?? "URL 미설정"}
      </Text>
    </BaseNode>
  );
};
