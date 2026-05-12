import { type PageResponse, type ValidationWarning } from "@/shared";

import { type ExecutionSummary } from "../../execution/api/types";
import { type TriggerConfig, type Workflow } from "../model";

export type WorkflowListResponse = PageResponse<WorkflowResponse>;
export type WorkflowListStatusFilter = "all" | "running" | "stopped";
export type WorkflowListStatus = Exclude<WorkflowListStatusFilter, "all">;

export interface EditorCatalogMeta {
  version: string;
  updated_at: string;
}

export interface SourceModeResponse {
  key: string;
  label: string;
  canonical_input_type: string;
  trigger_kind: string;
  target_schema: Record<string, unknown>;
}

export interface SourceServiceResponse {
  key: string;
  label: string;
  auth_required: boolean;
  source_modes: SourceModeResponse[];
}

export interface SourceCatalogResponse {
  _meta: EditorCatalogMeta;
  services: SourceServiceResponse[];
}

export type SourceTargetOptionType =
  | "category"
  | "course"
  | "term"
  | "file"
  | "folder";

export interface SourceTargetOptionItemResponse {
  id: string;
  label: string;
  description: string | null;
  type: SourceTargetOptionType | string;
  metadata: Record<string, unknown>;
}

export interface SourceTargetOptionsResponse {
  items: SourceTargetOptionItemResponse[];
  nextCursor: string | null;
}

export interface SourceTargetOptionsParameters {
  mode: string;
  parentId?: string;
  query?: string;
  cursor?: string;
}

export interface CreateGoogleDriveFolderRequest {
  name: string;
  parentId?: string;
}

export type SinkTargetOptionType =
  | "channel"
  | "page"
  | "folder"
  | "database"
  | "sheet";

export interface SinkTargetOptionItemResponse {
  id: string;
  label: string;
  description: string | null;
  type: SinkTargetOptionType | string;
  metadata: Record<string, unknown>;
}

export interface SinkTargetOptionsResponse {
  items: SinkTargetOptionItemResponse[];
  nextCursor: string | null;
}

export interface SinkTargetOptionsParameters {
  type: string;
  parentId?: string;
  query?: string;
  cursor?: string;
}

export interface SinkSchemaFieldResponse {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface SinkSchemaResponse {
  fields: SinkSchemaFieldResponse[];
}

export interface SinkServiceResponse {
  key: string;
  label: string;
  auth_required: boolean;
  accepted_input_types: string[];
  config_schema_scope: string;
  config_schema: SinkSchemaResponse;
}

export interface SinkCatalogResponse {
  _meta: EditorCatalogMeta;
  services: SinkServiceResponse[];
}

export interface MappingRulesMetaResponse {
  version: string;
  description: string;
  updated_at: string;
}

export interface MappingNodeTypeInfoResponse {
  label: string;
  description: string;
}

export interface MappingRuleOptionResponse {
  id: string;
  label: string;
  type?: string | null;
  node_type?: string | null;
  output_data_type?: string | null;
  priority?: number | null;
  branch_config?: MappingRuleFollowUpResponse | null;
}

export interface MappingRuleApplicableWhenResponse {
  [key: string]: unknown;
}

export interface MappingRuleFollowUpResponse {
  question: string;
  options?: MappingRuleOptionResponse[];
  options_source?: string | null;
  multi_select?: boolean | null;
  description?: string | null;
}

export interface MappingRuleActionResponse extends MappingRuleOptionResponse {
  description?: string;
  applicable_when?: MappingRuleApplicableWhenResponse;
  follow_up?: MappingRuleFollowUpResponse;
  branch_config?: MappingRuleFollowUpResponse;
}

export interface MappingRuleProcessingMethodResponse {
  question: string;
  options: MappingRuleOptionResponse[];
}

export interface MappingRuleDataTypeResponse {
  label: string;
  description: string;
  requires_processing_method: boolean;
  processing_method?: MappingRuleProcessingMethodResponse;
  actions: MappingRuleActionResponse[];
}

export interface MappingRulesResponse {
  _meta: MappingRulesMetaResponse;
  data_types: Record<string, MappingRuleDataTypeResponse>;
  node_types: Record<string, MappingNodeTypeInfoResponse>;
  service_fields: Record<string, string[]>;
}

export interface SchemaPreviewFieldResponse {
  key: string;
  label: string;
  value_type: string;
  required: boolean;
}

export interface SchemaPreviewResponse {
  schema_type: string;
  is_list: boolean;
  fields: SchemaPreviewFieldResponse[];
  display_hints: Record<string, string>;
}

export interface NodeInputPreviewResponse {
  dataType: string;
  label: string;
  sourceNodeId: string | null;
  sourceNodeLabel: string | null;
  schema: SchemaPreviewResponse;
}

export interface NodeOutputPreviewResponse {
  dataType: string;
  label: string;
  schema: SchemaPreviewResponse;
}

export interface SourceConfigSummaryResponse {
  service: string;
  serviceLabel: string;
  mode: string | null;
  modeLabel: string | null;
  target: string | null;
  targetLabel: string | null;
  canonicalInputType: string | null;
  triggerKind: string | null;
}

export interface NodeStatusSummaryResponse {
  configured: boolean;
  executable: boolean;
  missingFields: string[] | null;
}

export interface NodeSchemaPreviewResponse {
  nodeId: string;
  input?: NodeInputPreviewResponse | null;
  output?: NodeOutputPreviewResponse | null;
  source?: SourceConfigSummaryResponse | null;
  nodeStatus?: NodeStatusSummaryResponse | null;
}

export interface NodePreviewRequest {
  limit?: number;
  includeContent?: boolean;
}

export interface NodePreviewResponse {
  workflowId: string;
  nodeId: string;
  status: "available" | "unavailable" | "failed" | string;
  available: boolean;
  reason: string | null;
  inputData?: Record<string, unknown> | null;
  outputData?: Record<string, unknown> | null;
  previewData?: Record<string, unknown> | null;
  missingFields?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface PreviewWorkflowNodeCommand extends NodePreviewRequest {
  workflowId: string;
  nodeId: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes?: NodeDefinitionResponse[];
  edges?: EdgeDefinitionResponse[];
  trigger?: TriggerConfig | null;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: NodeDefinitionResponse[];
  edges?: EdgeDefinitionResponse[];
  trigger?: TriggerConfig | null;
  active?: boolean;
}

export type NodeDefinitionRole = "start" | "end" | "middle";

export interface NodeDefinitionResponse {
  id: string;
  category?: string;
  type: string;
  label?: string;
  role: NodeDefinitionRole;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  dataType: string | null;
  outputDataType: string | null;
  authWarning: boolean;
}

export interface EdgeDefinitionResponse {
  id?: string;
  source: string;
  target: string;
  label?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface WorkflowResponse extends Omit<Workflow, "nodes" | "edges"> {
  nodes: NodeDefinitionResponse[];
  edges: EdgeDefinitionResponse[];
  latestExecution?: ExecutionSummary | null;
  listStatus?: WorkflowListStatus | null;
  warnings?: ValidationWarning[];
  nodeStatuses?: WorkflowNodeStatusResponse[];
}

export type RawWorkflowListResponse = WorkflowListResponse | WorkflowResponse[];

export interface WorkflowNodeStatusResponse {
  nodeId: string;
  configured: boolean;
  saveable: boolean;
  choiceable: boolean;
  executable: boolean;
  missingFields: string[] | null;
}

export interface NodeAddRequest {
  category: string;
  type: string;
  label?: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
  dataType?: string | null;
  outputDataType?: string | null;
  role?: NodeDefinitionRole;
  authWarning?: boolean;
  prevNodeId?: string;
  prevEdgeLabel?: string;
  prevEdgeSourceHandle?: string;
  prevEdgeTargetHandle?: string;
}

export interface NodeUpdateRequest {
  category?: string;
  type?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
  dataType?: string | null;
  outputDataType?: string | null;
  role?: NodeDefinitionRole;
  authWarning?: boolean;
}

export interface SchemaPreviewRequest {
  nodes: NodeDefinitionResponse[];
  edges: EdgeDefinitionResponse[];
}

export interface SelectWorkflowChoiceCommand {
  optionId: string;
  context?: ChoiceSelectContext;
}

export interface SelectWorkflowChoiceTransportMeta {
  dataType?: string;
}

export interface SelectWorkflowChoiceRequestPayload {
  actionId: string;
  dataType?: string;
  context?: ChoiceSelectContext;
}

export interface ChoiceQueryContext {
  service?: string;
  file_subtype?: string;
}

export interface ChoiceSelectContext extends ChoiceQueryContext {
  fields?: string[];
}

export interface ShareRequest {
  userIds: string[];
}

export interface WorkflowGenerateRequest {
  prompt: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  type?: string | null;
  node_type?: string | null;
  output_data_type?: string | null;
  priority?: number | null;
  branch_config?: ChoiceBranchConfig | null;
}

export interface ChoiceFollowUp {
  question: string;
  options?: ChoiceOption[] | null;
  options_source?: string | null;
  multi_select?: boolean | null;
  description?: string | null;
}

export type ChoiceBranchConfig = ChoiceFollowUp;

export interface ChoiceResponse {
  question: string;
  options: ChoiceOption[];
  requiresProcessingMethod: boolean;
  multiSelect?: boolean | null;
}

export interface NodeSelectionResult {
  nodeType: string | null;
  outputDataType: string | null;
  followUp?: ChoiceFollowUp | null;
  branchConfig?: ChoiceBranchConfig | null;
}
