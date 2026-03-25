import { Box, Text } from "@chakra-ui/react";

import { getNodePresentation } from "@/entities/node";
import { useWorkflowStore } from "@/shared";

import type { NodePanelProps } from "../../model";

import { NodePanelShell } from "./NodePanelShell";

export const GenericNodePanel = ({ nodeId, data }: NodePanelProps) => {
  const startNodeId = useWorkflowStore((s) => s.startNodeId);
  const endNodeId = useWorkflowStore((s) => s.endNodeId);
  const presentation = getNodePresentation(data, {
    nodeId,
    startNodeId,
    endNodeId,
  });

  return (
    <NodePanelShell
      eyebrow={presentation.roleLabel}
      title={presentation.title}
      description="이 노드의 설정 패널을 여기에 연결할 수 있습니다."
    >
      <Box
        as="pre"
        p={3}
        borderRadius="lg"
        bg="bg.overlay"
        color="text.secondary"
        fontSize="xs"
        whiteSpace="pre-wrap"
        overflowX="auto"
      >
        {JSON.stringify(data.config, null, 2)}
      </Box>
      <Text fontSize="xs" color="text.secondary">
        새 패널을 추가할 때는 configure-node registry에 컴포넌트를 등록하면
        됩니다.
      </Text>
    </NodePanelShell>
  );
};
