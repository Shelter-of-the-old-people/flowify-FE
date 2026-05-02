import { request } from "@/shared/api/core";

import { type TargetOptionResponse, type TargetOptionsRequest } from "./types";

export const getTargetOptionsAPI = ({
  cursor,
  mode,
  parentId,
  query,
  serviceKey,
}: TargetOptionsRequest): Promise<TargetOptionResponse> =>
  request<TargetOptionResponse>({
    url: `/editor-catalog/sources/${serviceKey}/target-options`,
    method: "GET",
    params: {
      mode,
      parentId: parentId || undefined,
      query: query || undefined,
      cursor: cursor || undefined,
    },
  });
