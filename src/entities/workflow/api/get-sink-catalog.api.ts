import { request } from "@/shared/api/core";

import { type SinkCatalogResponse } from "./types";

export const getSinkCatalogAPI = (): Promise<SinkCatalogResponse> =>
  request<SinkCatalogResponse>({
    url: "/editor-catalog/sinks",
    method: "GET",
  });
