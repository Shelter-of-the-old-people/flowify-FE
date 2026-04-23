import { request } from "@/shared/api/core";

import { type SinkSchemaResponse } from "./types";

export const getSinkSchemaAPI = (
  serviceKey: string,
  inputType: string,
): Promise<SinkSchemaResponse> =>
  request<SinkSchemaResponse>({
    url: `/editor-catalog/sinks/${serviceKey}/schema`,
    method: "GET",
    params: {
      inputType,
    },
  });
