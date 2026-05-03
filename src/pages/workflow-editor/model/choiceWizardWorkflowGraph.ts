import { NODE_REGISTRY } from "@/entities/node";
import { type FlowNodeData, type NodeType } from "@/entities/node";
import { type WorkflowResponse } from "@/entities/workflow";
import {
  type WorkflowHydratedState,
  hydrateStore,
} from "@/features/workflow-editor";

type SyncWorkflowGraph = (
  payload: WorkflowHydratedState,
  options?: {
    preserveActivePanelNodeId?: boolean;
    preserveActivePlaceholder?: boolean;
    preserveDirty?: boolean;
  },
) => void;

export const buildChoiceWizardNodeConfig = ({
  type,
  baseConfig,
  isConfigured,
  overrides,
  preserveExistingConfig = false,
}: {
  type: NodeType;
  baseConfig?: FlowNodeData["config"];
  isConfigured: boolean;
  overrides?: Partial<FlowNodeData["config"]>;
  preserveExistingConfig?: boolean;
}) =>
  ({
    ...(preserveExistingConfig
      ? (baseConfig ?? NODE_REGISTRY[type].defaultConfig)
      : NODE_REGISTRY[type].defaultConfig),
    ...overrides,
    isConfigured,
  }) as FlowNodeData["config"];

export const createChoiceWizardWorkflowSync =
  (syncWorkflowGraph: SyncWorkflowGraph) => (workflow: WorkflowResponse) => {
    syncWorkflowGraph(hydrateStore(workflow), {
      preserveActivePanelNodeId: true,
      preserveActivePlaceholder: true,
      preserveDirty: true,
    });
  };
