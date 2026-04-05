import type { MouseEvent, ReactNode } from "react";
import { MdClose } from "react-icons/md";

import { Box, Icon, IconButton, Text } from "@chakra-ui/react";
import { Handle, Position } from "@xyflow/react";

// source Handle만 사용 — 사용자가 직접 노드를 연결하지 않으므로 target Handle 제거

import { useWorkflowStore } from "@/shared";

import { getNodePresentation } from "../model";
import type { FlowNodeData } from "../model/types";

interface BaseNodeProps {
  id: string;
  data: FlowNodeData;
  selected: boolean;
  children?: ReactNode;
}

const getSummaryContent = (
  helperText: string | null,
  children?: ReactNode,
): ReactNode => {
  if (helperText) {
    return helperText;
  }

  return children ?? null;
};

export const BaseNode = ({ id, data, selected, children }: BaseNodeProps) => {
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const openPanel = useWorkflowStore((s) => s.openPanel);
  const startNodeId = useWorkflowStore((s) => s.startNodeId);
  const endNodeId = useWorkflowStore((s) => s.endNodeId);

  const presentation = getNodePresentation(data, {
    nodeId: id,
    startNodeId,
    endNodeId,
  });
  const summaryContent = getSummaryContent(presentation.helperText, children);

  const handleOpenPanel = () => {
    openPanel(id);
  };

  const handleRemoveNode = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    removeNode(id);
  };

  return (
    <Box
      position="relative"
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
      minW="172px"
      px={4}
      py={3}
      borderRadius="xl"
      bg="transform"
      transition="border-color 150ms ease, box-shadow 150ms ease"
      cursor="pointer"
      onClick={handleOpenPanel}
    >
      <Text fontSize="xs" fontWeight="medium" color="text.secondary">
        {presentation.roleLabel}
      </Text>

      <Icon
        as={presentation.iconComponent}
        boxSize={14}
        color={data.config.isConfigured ? "text.primary" : "text.secondary"}
      />

      <Text
        fontSize="lg"
        fontWeight="bold"
        color="text.primary"
        textAlign="center"
        lineHeight="short"
      >
        {presentation.title}
      </Text>

      {summaryContent ? (
        <Box
          width="100%"
          fontSize="xs"
          color="text.secondary"
          textAlign="center"
          lineHeight="short"
        >
          {summaryContent}
        </Box>
      ) : null}

      {selected ? (
        <IconButton
          aria-label="노드 삭제"
          size="xs"
          position="absolute"
          top={1}
          right={1}
          variant="ghost"
          onClick={handleRemoveNode}
        >
          <MdClose />
        </IconButton>
      ) : null}

      <Handle type="source" position={Position.Right} />
    </Box>
  );
};
