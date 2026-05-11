import { request } from "@/shared/api/core";

import { type DashboardSummaryResponse } from "./types";

export const getDashboardSummaryAPI = (): Promise<DashboardSummaryResponse> =>
  request<DashboardSummaryResponse>({
    url: "/dashboard/summary",
    method: "GET",
  });
