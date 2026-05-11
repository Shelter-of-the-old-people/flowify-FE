import { request } from "@/shared/api/core";

import {
  type CreateGoogleSheetsSpreadsheetRequest,
  type SourceTargetOptionItemResponse,
} from "./types";

export const createGoogleSheetsSpreadsheetAPI = (
  body: CreateGoogleSheetsSpreadsheetRequest,
): Promise<SourceTargetOptionItemResponse> =>
  request<SourceTargetOptionItemResponse>({
    url: "/editor-catalog/google-sheets/spreadsheets",
    method: "POST",
    data: body,
  });
