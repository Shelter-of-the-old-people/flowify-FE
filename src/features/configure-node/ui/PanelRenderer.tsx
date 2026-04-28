import { Component } from "react";
import { type ErrorInfo, type ReactNode } from "react";

import { Box, Text } from "@chakra-ui/react";

import { useWorkflowStore } from "@/features/workflow-editor";

import { NODE_PANEL_REGISTRY } from "../model";

import { GenericNodePanel, SinkNodePanel } from "./panels";

interface PanelErrorBoundaryState {
  hasError: boolean;
}

class PanelErrorBoundary extends Component<
  { children: ReactNode },
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PanelRenderer] panel render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={4}>
          <Text color="status.error" fontSize="sm">
            Panel could not be displayed.
          </Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

export const PanelRenderer = ({ readOnly = false }: { readOnly?: boolean }) => {
  const activeNode = useWorkflowStore(
    (s) => s.nodes.find((node) => node.id === s.activePanelNodeId) ?? null,
  );
  const endNodeId = useWorkflowStore((s) => s.endNodeId);

  if (!activeNode) return null;

  const PanelComponent =
    activeNode.id === endNodeId
      ? SinkNodePanel
      : (NODE_PANEL_REGISTRY[activeNode.data.type] ?? GenericNodePanel);

  return (
    <PanelErrorBoundary>
      <PanelComponent
        nodeId={activeNode.id}
        data={activeNode.data}
        readOnly={readOnly}
      />
    </PanelErrorBoundary>
  );
};
