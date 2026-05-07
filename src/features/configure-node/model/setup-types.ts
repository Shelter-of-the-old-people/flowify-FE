import { type FlowNodeData } from "@/entities/node";
import {
  type SinkSchemaFieldResponse,
  type SourceTargetOptionItemResponse,
} from "@/entities/workflow";

export type SourceTargetSetupValue = {
  option: SourceTargetOptionItemResponse | null;
  value: string;
};

export type SinkSetupDraftValues = Record<string, string>;

export type SinkSetupAuxiliaryDraftValues = Record<string, unknown>;

export type SourceNodeConfigDraftParameters = {
  currentConfig: FlowNodeData["config"];
  targetSchema: Record<string, unknown>;
  targetValue: SourceTargetSetupValue;
};

export type SinkNodeConfigDraftParameters = {
  auxiliaryDraftValues: SinkSetupAuxiliaryDraftValues;
  currentConfig: FlowNodeData["config"];
  draftValues: SinkSetupDraftValues;
  fields: SinkSchemaFieldResponse[];
};
