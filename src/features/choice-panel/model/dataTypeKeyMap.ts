import type { DataType } from "@/entities/node";
import type { NodeType } from "@/entities/node";

import type { MappingDataTypeKey, MappingNodeType } from "./types";

// ─── DataType ↔ MappingDataTypeKey 변환 ─────────────────────

const DATA_TYPE_TO_MAPPING_KEY: Record<DataType, MappingDataTypeKey> = {
  "file-list": "FILE_LIST",
  "single-file": "SINGLE_FILE",
  text: "TEXT",
  spreadsheet: "SPREADSHEET_DATA",
  "email-list": "EMAIL_LIST",
  "single-email": "SINGLE_EMAIL",
  "schedule-data": "SCHEDULE_DATA",
  "api-response": "API_RESPONSE",
};

const MAPPING_KEY_TO_DATA_TYPE: Record<MappingDataTypeKey, DataType> = {
  FILE_LIST: "file-list",
  SINGLE_FILE: "single-file",
  TEXT: "text",
  SPREADSHEET_DATA: "spreadsheet",
  EMAIL_LIST: "email-list",
  SINGLE_EMAIL: "single-email",
  SCHEDULE_DATA: "schedule-data",
  API_RESPONSE: "api-response",
};

export const toMappingKey = (dataType: DataType): MappingDataTypeKey =>
  DATA_TYPE_TO_MAPPING_KEY[dataType];

export const toDataType = (mappingKey: MappingDataTypeKey): DataType =>
  MAPPING_KEY_TO_DATA_TYPE[mappingKey];

// ─── MappingNodeType → NodeType 변환 ────────────────────────

export const MAPPING_NODE_TYPE_MAP: Record<MappingNodeType, NodeType> = {
  LOOP: "loop",
  CONDITION_BRANCH: "condition",
  AI: "llm",
  DATA_FILTER: "filter",
  AI_FILTER: "filter",
  PASSTHROUGH: "data-process",
};
