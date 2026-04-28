import { request } from "@/shared/api/core";

import { type MappingRulesResponse } from "./types";

export const getMappingRulesAPI = (): Promise<MappingRulesResponse> =>
  request<MappingRulesResponse>({
    url: "/editor-catalog/mapping-rules",
    method: "GET",
  });
