import { request } from "@/shared/api/core";

import {
  type CreateGoogleSheetRequest,
  type SourceTargetOptionItemResponse,
} from "./types";

export const createGoogleSheetAPI = (
  body: CreateGoogleSheetRequest,
): Promise<SourceTargetOptionItemResponse> =>
  request<SourceTargetOptionItemResponse>({
    url: "/editor-catalog/google-sheets/sheets",
    method: "POST",
    data: body,
  });
