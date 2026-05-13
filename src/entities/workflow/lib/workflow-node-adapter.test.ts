import { describe, expect, it } from "vitest";

import { type FlowNodeData } from "@/entities/node";

import { type NodeDefinitionResponse } from "../api";

import { toFlowNode, toNodeDefinition } from "./workflow-node-adapter";

describe("workflow node adapter", () => {
  it("persists the Google Sheets service key for middle spreadsheet nodes", () => {
    const flowNode = {
      id: "node-sheets",
      type: "spreadsheet",
      position: { x: 120, y: 80 },
      data: {
        type: "spreadsheet",
        label: "Google Sheets",
        config: {
          isConfigured: true,
          service: "google_sheets",
          action: "search_text",
          spreadsheet_id: "spreadsheet-1",
          sheet_name: "Sheet1",
        } as FlowNodeData["config"],
        workflowRole: "middle",
        inputTypes: ["text"],
        outputTypes: ["spreadsheet"],
        authWarning: false,
      } satisfies FlowNodeData,
    } as Parameters<typeof toNodeDefinition>[0];

    const definition = toNodeDefinition(flowNode, null, []);

    expect(definition.type).toBe("google_sheets");
    expect(definition.role).toBe("middle");
    expect(definition.config).toMatchObject({
      service: "google_sheets",
      action: "search_text",
      spreadsheet_id: "spreadsheet-1",
      sheet_name: "Sheet1",
    });
  });

  it("rehydrates Google Sheets middle nodes with the service config restored", () => {
    const nodeDefinition: NodeDefinitionResponse = {
      id: "node-sheets",
      category: "service",
      type: "google_sheets",
      role: "middle",
      position: { x: 120, y: 80 },
      config: {
        action: "lookup_row_by_key",
        spreadsheet_id: "spreadsheet-1",
        sheet_name: "Sheet1",
        key_column: "id",
      },
      dataType: "TEXT",
      outputDataType: "SPREADSHEET_DATA",
      authWarning: false,
    };

    const flowNode = toFlowNode(nodeDefinition);

    expect(flowNode.data.type).toBe("spreadsheet");
    expect(flowNode.data.config).toMatchObject({
      service: "google_sheets",
      action: "lookup_row_by_key",
      spreadsheet_id: "spreadsheet-1",
      sheet_name: "Sheet1",
      key_column: "id",
    });
  });
});
