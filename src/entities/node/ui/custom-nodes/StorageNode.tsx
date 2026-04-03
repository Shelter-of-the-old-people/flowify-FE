import { Text } from "@chakra-ui/react";
import type { Node, NodeProps } from "@xyflow/react";

import { getTypedConfig } from "../../model";
import type { FlowNodeData } from "../../model/types";
import { BaseNode } from "../BaseNode";

const STORAGE_SERVICE_LABEL: Record<"google-drive" | "notion", string> = {
  "google-drive": "Google Drive",
  notion: "Notion",
};

export const StorageNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) => {
  const config = getTypedConfig("storage", data.config);
  const summary =
    config.service || config.action ? (
      <Text fontSize="xs" color="text.secondary">
        {config.service ? STORAGE_SERVICE_LABEL[config.service] : null}
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
