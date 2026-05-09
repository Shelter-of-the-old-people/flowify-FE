import { Box, Text } from "@chakra-ui/react";

import { getNodePresentation } from "@/entities/node";
import { useWorkflowStore } from "@/features/workflow-editor";

import { type NodePanelProps } from "../../model";

import { NodePanelShell } from "./NodePanelShell";

export const GenericNodePanel = ({ nodeId, data }: NodePanelProps) => {
  const startNodeId = useWorkflowStore((s) => s.startNodeId);
  const endNodeIds = useWorkflowStore((s) => s.endNodeIds);
  const presentation = getNodePresentation(data, {
    nodeId,
    startNodeId,
    endNodeIds,
    workflowRole: data.workflowRole,
  });

  return (
    <NodePanelShell
      eyebrow={presentation.roleLabel}
      title={presentation.title}
      description="선택한 설정으로 준비된 단계입니다."
    >
      <Box bg="gray.50" borderRadius="xl" px={4} py={3}>
        <Text fontSize="sm" fontWeight="semibold">
          설정 정보
        </Text>
        <Text color="text.secondary" fontSize="sm" mt={1}>
          이 단계는 선택한 설정을 기준으로 워크플로우에 연결됩니다.
        </Text>
      </Box>

      <Box as="details" color="text.secondary" fontSize="xs">
        <Box as="summary" cursor="pointer" px={1} py={1}>
          상세 설정 보기
        </Box>
        <Box
          as="pre"
          p={3}
          borderRadius="lg"
          bg="bg.overlay"
          color="text.secondary"
          whiteSpace="pre-wrap"
          overflowX="auto"
        >
          {JSON.stringify(data.config, null, 2)}
        </Box>
      </Box>
    </NodePanelShell>
  );
};
