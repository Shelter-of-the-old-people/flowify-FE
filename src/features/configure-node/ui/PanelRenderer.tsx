import { useWorkflowStore } from "@/shared";

import { NODE_PANEL_REGISTRY } from "../model";

import { GenericNodePanel } from "./panels";

export const PanelRenderer = () => {
  const activeNode = useWorkflowStore(
    (s) => s.nodes.find((node) => node.id === s.activePanelNodeId) ?? null,
  );

  if (!activeNode) return null;

  const PanelComponent =
    NODE_PANEL_REGISTRY[activeNode.data.type] ?? GenericNodePanel;

  return <PanelComponent nodeId={activeNode.id} data={activeNode.data} />;
};
