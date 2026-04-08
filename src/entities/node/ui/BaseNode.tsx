import { useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { MdCancel } from "react-icons/md";

import { Box, Icon, IconButton, Text } from "@chakra-ui/react";
import { Handle, Position } from "@xyflow/react";

import { useWorkflowStore } from "@/shared";

import { getNodePresentation } from "../model";
import type { FlowNodeData } from "../model/types";

interface BaseNodeProps {
  id: string;
  data: FlowNodeData;
  selected: boolean;
  children?: ReactNode;
}

const HIDDEN_HANDLE_STYLE = {
  opacity: 0,
  width: 0,
  height: 0,
  pointerEvents: "none" as const,
};

const getSummaryContent = (
  helperText: string | null,
  children?: ReactNode,
): ReactNode => {
  if (helperText) {
    return helperText;
  }

  return children ?? null;
};

export const BaseNode = ({ id, data, children }: BaseNodeProps) => {
  const removeNode = useWorkflowStore((state) => state.removeNode);
  const openPanel = useWorkflowStore((state) => state.openPanel);
  const startNodeId = useWorkflowStore((state) => state.startNodeId);
  const endNodeId = useWorkflowStore((state) => state.endNodeId);
  const [isHovered, setIsHovered] = useState(false);

  const presentation = getNodePresentation(data, {
    nodeId: id,
    startNodeId,
    endNodeId,
  });
  const summaryContent = getSummaryContent(presentation.helperText, children);
  const showNodeIcon = data.config.isConfigured;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Text fontSize="xs" fontWeight="medium" color="text.secondary">
        {presentation.roleLabel}
      </Text>

      <Box h={14} display="flex" alignItems="center" justifyContent="center">
        {showNodeIcon ? (
          <Icon
            as={presentation.iconComponent}
            boxSize={14}
            color="text.primary"
          />
        ) : null}
      </Box>

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

      {isHovered ? (
        <IconButton
          aria-label="노드 삭제"
          size="xs"
          position="absolute"
          top={1}
          right={1}
          variant="ghost"
          onClick={handleRemoveNode}
        >
          <MdCancel />
        </IconButton>
      ) : null}

      <Handle
        type="target"
        position={Position.Left}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />
    </Box>
  );
};
