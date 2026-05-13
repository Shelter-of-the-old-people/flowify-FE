import { type ReactNode, useState } from "react";
import { MdErrorOutline, MdWarningAmber } from "react-icons/md";

import { Box, Icon, Text } from "@chakra-ui/react";
import { Handle, Position } from "@xyflow/react";

import { getNodeStatusSummaryLabel } from "@/entities/workflow";
import { ServiceIcon } from "@/shared";

import {
  type NodeVisualIssueTone,
  getNodePresentation,
  getNodeSummaryLines,
} from "../model";
import { type FlowNodeData } from "../model/types";

import { useNodeEditorContext } from "./NodeEditorContext";
import { NodeMoreMenuButton } from "./NodeMoreMenuButton";

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

const ROUTING_SOURCE_HANDLE_IDS = [
  "pdf",
  "image",
  "spreadsheet",
  "document",
  "presentation",
  "other",
];

type NodeIssueStyle = {
  iconColor: string;
  iconShadow: string;
};

const getNodeIssueIconShadow = (colorToken: string) =>
  `drop-shadow(0 0 8px color-mix(in srgb, ${colorToken} 52%, transparent)) drop-shadow(0 0 20px color-mix(in srgb, ${colorToken} 28%, transparent))`;

const NODE_ISSUE_STYLES: Record<NodeVisualIssueTone, NodeIssueStyle> = {
  error: {
    iconColor: "status.error",
    iconShadow: getNodeIssueIconShadow("var(--sd-colors-status-error)"),
  },
  warning: {
    iconColor: "yellow.400",
    iconShadow: getNodeIssueIconShadow("var(--sd-colors-yellow-400)"),
  },
};

const NODE_ISSUE_ICON = {
  error: MdErrorOutline,
  warning: MdWarningAmber,
} satisfies Record<NodeVisualIssueTone, typeof MdErrorOutline>;

const getSummaryContent = (
  helperText: string | null,
  summaryLines: string[],
  children?: ReactNode,
): ReactNode => {
  if (helperText) {
    return helperText;
  }

  if (children) {
    return children;
  }

  if (summaryLines.length === 0) {
    return null;
  }

  return summaryLines.map((line) => (
    <Text key={line} as="span" display="block">
      {line}
    </Text>
  ));
};

const getNodeServiceKey = (data: FlowNodeData) => {
  const config = data.config as unknown as Record<string, unknown>;

  return typeof config.service === "string" ? config.service : null;
};

const getNodeSourceMode = (data: FlowNodeData) => {
  const config = data.config as unknown as Record<string, unknown>;

  return typeof config.source_mode === "string" ? config.source_mode : null;
};

export const BaseNode = ({ id, data, selected, children }: BaseNodeProps) => {
  const {
    canEditNodes,
    endNodeIds,
    getNodeStatus,
    getNodeVisualIssue,
    onOpenPanel,
    onRemoveNode,
    startNodeId,
  } = useNodeEditorContext();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const nodeStatus = getNodeStatus(id);
  const nodeVisualIssue = getNodeVisualIssue(id);
  const nodeIssueStyle = nodeVisualIssue
    ? NODE_ISSUE_STYLES[nodeVisualIssue.tone]
    : null;
  const isSelected = Boolean(selected);

  const presentation = getNodePresentation(data, {
    nodeId: id,
    startNodeId,
    endNodeIds,
    workflowRole: data.workflowRole,
  });
  const nodeStatusSummary = nodeStatus
    ? getNodeStatusSummaryLabel(nodeStatus)
    : null;
  const issueMessage = nodeVisualIssue?.message ?? null;
  const nodeSummaryLines = getNodeSummaryLines(data);
  const summaryContent = getSummaryContent(
    issueMessage ?? nodeStatusSummary ?? presentation.helperText,
    nodeSummaryLines,
    children,
  );
  const serviceKey = getNodeServiceKey(data);
  const sourceMode = getNodeSourceMode(data);
  const shouldShowNodeMenu =
    canEditNodes && (isHovered || isSelected || isMenuOpen);

  const renderNodeIcon = () => {
    return (
      <ServiceIcon
        color="text.primary"
        fallbackIcon={presentation.iconComponent}
        serviceKey={serviceKey}
        size={56}
        sourceMode={sourceMode}
      />
    );
  };

  const handleOpenPanel = () => {
    onOpenPanel(id);
  };

  const handleRemoveNode = () => {
    setIsMenuOpen(false);
    onRemoveNode(id);
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
      bg="transparent"
      borderWidth="0px"
      borderStyle="solid"
      borderColor="transparent"
      boxShadow="none"
      outline="0 solid transparent"
      isolation="isolate"
      transition="color 150ms ease"
      cursor="pointer"
      onClick={handleOpenPanel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Text
        position="relative"
        zIndex={1}
        fontSize="xs"
        fontWeight="medium"
        color="text.secondary"
      >
        {presentation.roleLabel}
      </Text>

      <Box
        position="relative"
        zIndex={1}
        h={14}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Box
          position="relative"
          zIndex={1}
          filter={nodeIssueStyle?.iconShadow ?? "none"}
          transition="filter 150ms ease"
        >
          {renderNodeIcon()}
        </Box>
      </Box>

      <Text
        position="relative"
        zIndex={1}
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
          position="relative"
          zIndex={1}
          display={nodeVisualIssue ? "flex" : "block"}
          alignItems="center"
          justifyContent="center"
          gap={1}
          width="100%"
          fontSize="xs"
          color="text.secondary"
          textAlign="center"
          lineHeight="short"
          fontWeight={nodeIssueStyle ? "semibold" : "medium"}
        >
          {nodeVisualIssue && nodeIssueStyle ? (
            <Icon
              as={NODE_ISSUE_ICON[nodeVisualIssue.tone]}
              boxSize="14px"
              color={nodeIssueStyle.iconColor}
              flexShrink={0}
            />
          ) : null}
          {summaryContent}
        </Box>
      ) : null}

      {shouldShowNodeMenu ? (
        <Box
          className="nodrag nopan"
          position="absolute"
          top={1}
          right={1}
          zIndex={1}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <NodeMoreMenuButton
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            onDelete={handleRemoveNode}
          />
        </Box>
      ) : null}

      <Handle
        type="target"
        position={Position.Left}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        id="input"
        type="target"
        position={Position.Left}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />
      {ROUTING_SOURCE_HANDLE_IDS.map((handleId) => (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={Position.Right}
          style={HIDDEN_HANDLE_STYLE}
        />
      ))}
    </Box>
  );
};
