import { request } from "@/shared/api/core";

import {
  type CreateGoogleDriveFolderRequest,
  type SourceTargetOptionItemResponse,
} from "./types";

export const createGoogleDriveFolderAPI = (
  body: CreateGoogleDriveFolderRequest,
): Promise<SourceTargetOptionItemResponse> =>
  request<SourceTargetOptionItemResponse>({
    url: "/editor-catalog/sinks/google_drive/folders",
    method: "POST",
    data: body,
  });
