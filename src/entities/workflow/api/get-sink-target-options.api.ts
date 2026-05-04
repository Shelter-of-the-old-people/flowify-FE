import { request } from "@/shared/api/core";

import {
  type SinkTargetOptionsParameters,
  type SinkTargetOptionsResponse,
} from "./types";

const toSinkTargetOptionsQueryParams = (
  params: SinkTargetOptionsParameters,
) => {
  const queryParams: Record<string, string> = {
    type: params.type,
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

export const getSinkTargetOptionsAPI = (
  serviceKey: string,
  params: SinkTargetOptionsParameters,
): Promise<SinkTargetOptionsResponse> =>
  request<SinkTargetOptionsResponse>({
    url: `/editor-catalog/sinks/${serviceKey}/target-options`,
    method: "GET",
    params: toSinkTargetOptionsQueryParams(params),
  });
