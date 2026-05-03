import { request } from "@/shared/api/core";

import {
  type SourceTargetOptionsParameters,
  type SourceTargetOptionsResponse,
} from "./types";

const toSourceTargetOptionsQueryParams = (
  params: SourceTargetOptionsParameters,
) => {
  const queryParams: Record<string, string> = {
    mode: params.mode,
  };
  const parentId = params.parentId?.trim();
  const query = params.query?.trim();
  const cursor = params.cursor?.trim();

  if (parentId) {
    queryParams.parentId = parentId;
  }

  if (query) {
    queryParams.query = query;
  }

  if (cursor) {
    queryParams.cursor = cursor;
  }

  return queryParams;
};

export const getSourceTargetOptionsAPI = (
  serviceKey: string,
  params: SourceTargetOptionsParameters,
): Promise<SourceTargetOptionsResponse> =>
  request<SourceTargetOptionsResponse>({
    url: `/editor-catalog/sources/${serviceKey}/target-options`,
    method: "GET",
    params: toSourceTargetOptionsQueryParams(params),
  });
