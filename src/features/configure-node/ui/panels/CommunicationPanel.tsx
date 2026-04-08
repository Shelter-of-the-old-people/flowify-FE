import { Box, Button, Text } from "@chakra-ui/react";

import {
  type CommunicationNodeConfig,
  getNodePresentation,
  getTypedConfig,
} from "@/entities/node";
import { useWorkflowStore } from "@/shared";

import type { NodePanelProps } from "../../model";

import { NodePanelShell } from "./NodePanelShell";

const COMMUNICATION_SERVICE_OPTIONS = [
  { value: "gmail", label: "Gmail" },
  { value: "slack", label: "Slack" },
] as const satisfies ReadonlyArray<{
  value: NonNullable<CommunicationNodeConfig["service"]>;
  label: string;
}>;

export const CommunicationPanel = ({ nodeId, data }: NodePanelProps) => {
  const startNodeId = useWorkflowStore((s) => s.startNodeId);
  const endNodeId = useWorkflowStore((s) => s.endNodeId);
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig);

  const presentation = getNodePresentation(data, {
    nodeId,
    startNodeId,
    endNodeId,
  });
  const config = getTypedConfig("communication", data.config);

  const handleServiceChange = (
    service: NonNullable<CommunicationNodeConfig["service"]>,
  ) => {
    updateNodeConfig(nodeId, { service });
  };

  return (
    <NodePanelShell
      eyebrow={presentation.roleLabel}
      title={presentation.title}
      description="Select the communication service for this node."
    >
      <Box display="flex" flexDirection="column" gap={3}>
        <Text fontSize="sm" fontWeight="medium" color="text.primary">
          Service
        </Text>

        <Box display="flex" gap={2} flexWrap="wrap">
          {COMMUNICATION_SERVICE_OPTIONS.map((option) => {
            const selected = config.service === option.value;

            return (
              <Button
                key={option.value}
                size="sm"
                variant={selected ? "solid" : "outline"}
                onClick={() => handleServiceChange(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      {config.service ? (
        <Text fontSize="xs" color="text.secondary">
          Selected service:{" "}
          {COMMUNICATION_SERVICE_OPTIONS.find(
            (option) => option.value === config.service,
          )?.label ?? config.service}
        </Text>
      ) : (
        <Text fontSize="xs" color="text.secondary">
          Choose one service to mark this node as configured.
        </Text>
      )}
    </NodePanelShell>
  );
};
