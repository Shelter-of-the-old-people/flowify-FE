/** 매핑 규칙에서 사용하는 데이터 타입 키 (백엔드 형식) */
export type MappingDataTypeKey =
  | "FILE_LIST"
  | "SINGLE_FILE"
  | "EMAIL_LIST"
  | "SINGLE_EMAIL"
  | "SPREADSHEET_DATA"
  | "API_RESPONSE"
  | "SCHEDULE_DATA"
  | "TEXT";

/** 매핑 규칙에서 사용하는 노드 타입 (백엔드 형식) */
export type MappingNodeType =
  | "LOOP"
  | "CONDITION_BRANCH"
  | "AI"
  | "DATA_FILTER"
  | "AI_FILTER"
  | "PASSTHROUGH";

/** follow_up / branch_config 옵션 */
export interface FollowUpOption {
  id: string;
  label: string;
  type?: "text_input" | "number_input";
}

/** follow_up 설정 */
export interface FollowUp {
  question: string;
  options?: FollowUpOption[];
  options_source?: "fields_from_data" | "fields_from_service";
  multi_select?: boolean;
  description?: string;
}

/** branch_config 설정 */
export interface BranchConfig {
  question: string;
  options?: FollowUpOption[];
  options_source?: "fields_from_data";
  multi_select?: boolean;
  description?: string;
}

/** applicable_when 조건 */
export interface ApplicableWhen {
  file_subtype?: string[];
}

/** 처리 방식 옵션 (Step 1) */
export interface ProcessingMethodOption {
  id: string;
  label: string;
  node_type: MappingNodeType | null;
  output_data_type: MappingDataTypeKey;
  priority: number;
}

/** 처리 방식 질문 */
export interface ProcessingMethod {
  question: string;
  options: ProcessingMethodOption[];
}

/** 액션 선택지 (Step 2) */
export interface MappingAction {
  id: string;
  label: string;
  node_type: MappingNodeType;
  output_data_type: MappingDataTypeKey;
  priority: number;
  description?: string;
  applicable_when?: ApplicableWhen;
  follow_up?: FollowUp;
  branch_config?: BranchConfig;
}

/** 데이터 타입별 매핑 규칙 */
export interface DataTypeMapping {
  label: string;
  description: string;
  requires_processing_method: boolean;
  processing_method?: ProcessingMethod;
  actions: MappingAction[];
}

/** 전체 매핑 규칙 */
export interface MappingRules {
  data_types: Record<MappingDataTypeKey, DataTypeMapping>;
  node_types: Record<MappingNodeType, { label: string; description: string }>;
  service_fields: Record<string, string[]>;
}
