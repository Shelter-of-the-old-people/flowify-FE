import { request } from "@/shared/api/core";

import {
  type CreateGoogleDriveFolderRequest,
  type TargetOptionItemResponse,
} from "./types";

export const createGoogleDriveFolderAPI = ({
  name,
  parentId,
}: CreateGoogleDriveFolderRequest): Promise<TargetOptionItemResponse> =>
  request<TargetOptionItemResponse>({
    url: "/editor-catalog/sinks/google_drive/folders",
    method: "POST",
    data: {
      name,
      parentId: parentId || null,
    },
  });
