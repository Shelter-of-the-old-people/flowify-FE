import { type IconType } from "react-icons";
import { MdClose, MdSettings } from "react-icons/md";

import { Box, HStack, Icon, IconButton, Text } from "@chakra-ui/react";
import { Handle, Position } from "@xyflow/react";

import { useWorkflowStore } from "@/shared";

import { NODE_REGISTRY } from "../model/nodeRegistry";
import type { FlowNodeData } from "../model/types";

interface BaseNodeProps {
  id: string;
  data: FlowNodeData;
  selected: boolean;
  children?: React.ReactNode;
}

const ICON_STYLE: React.CSSProperties = {
  color: "white",
  width: "16px",
  height: "16px",
};

export const BaseNode = ({ id, data, selected, children }: BaseNodeProps) => {
  const meta = NODE_REGISTRY[data.type];
  const openPanel = useWorkflowStore((s) => s.openPanel);
  const removeNode = useWorkflowStore((s) => s.removeNode);

  return (
    <Box
      border="2px solid"
      borderColor={selected ? "border.selected" : "border.default"}
      borderRadius="lg"
      minW="200px"
      bg="bg.surface"
      boxShadow={selected ? "md" : "sm"}
      transition="border-color 150ms ease, box-shadow 150ms ease"
    >
      {/* 입력 핸들 */}
      <Handle type="target" position={Position.Left} />

      {/* 헤더 */}
      <HStack
        bg={meta.color}
        px={3}
        py={2}
        borderTopRadius="md"
        justify="space-between"
      >
        <HStack gap={1.5}>
          <Icon as={meta.iconComponent as IconType} style={ICON_STYLE} />
          <Text color="white" fontWeight="bold" fontSize="sm">
            {meta.label}
          </Text>
        </HStack>
        <HStack gap={0}>
          <IconButton
            aria-label="설정"
            size="xs"
            variant="ghost"
            colorPalette="whiteAlpha"
            onClick={() => openPanel(id)}
          >
            <MdSettings color="white" />
          </IconButton>
          <IconButton
            aria-label="삭제"
            size="xs"
            variant="ghost"
            colorPalette="whiteAlpha"
            onClick={() => removeNode(id)}
          >
            <MdClose color="white" />
          </IconButton>
        </HStack>
      </HStack>

      {/* 본문 — 설정 요약 */}
      <Box
        px={3}
        py={2}
        fontSize="xs"
        color="text.secondary"
        minH="36px"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {data.config.isConfigured ? (
          children
        ) : (
          <Text color="warning.500">설정이 필요합니다</Text>
        )}
      </Box>

      {/* 출력 핸들 */}
      <Handle type="source" position={Position.Right} />
    </Box>
  );
};
