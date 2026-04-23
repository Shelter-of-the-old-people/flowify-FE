import { request } from "@/shared/api/core";

import { type SourceCatalogResponse } from "./types";

export const getSourceCatalogAPI = (): Promise<SourceCatalogResponse> =>
  request<SourceCatalogResponse>({
    url: "/editor-catalog/sources",
    method: "GET",
  });
