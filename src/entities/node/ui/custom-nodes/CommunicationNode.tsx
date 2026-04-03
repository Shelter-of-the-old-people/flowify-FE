import { Text } from "@chakra-ui/react";
import type { Node, NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

const COMMUNICATION_SERVICE_LABEL: Record<"gmail" | "slack", string> = {
  gmail: "Gmail",
  slack: "Slack",
};

export const CommunicationNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) => {
  const config = getTypedConfig("communication", data.config);
  const summary =
    config.service || config.action ? (
      <Text fontSize="xs" color="text.secondary">
        {config.service ? COMMUNICATION_SERVICE_LABEL[config.service] : null}
        {config.service && config.action ? " / " : null}
        {config.action}
      </Text>
    ) : null;

  return (
    <BaseNode id={id} data={data} selected={selected ?? false}>
      {summary}
    </BaseNode>
  );
};
