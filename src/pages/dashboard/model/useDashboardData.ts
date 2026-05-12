import { useMemo, useState } from "react";

import {
  isOAuthConnectSupported,
  useConnectOAuthTokenMutation,
  useDashboardSummaryQuery,
  useDisconnectOAuthTokenMutation,
  useOAuthTokensQuery,
} from "@/entities";
import { getCurrentRelativeUrl, storeOAuthConnectReturnPath } from "@/shared";

import {
  getConnectedServiceCards,
  getDashboardIssuesFromSummary,
  getDashboardMetrics,
  getRecommendedServiceCards,
} from "./dashboard";

export const useDashboardData = () => {
  const summaryQuery = useDashboardSummaryQuery();
  const oauthTokensQuery = useOAuthTokensQuery();
  const { mutateAsync: connectToken, isPending: isConnectPending } =
    useConnectOAuthTokenMutation();
  const { mutateAsync: disconnectToken, isPending: isDisconnectPending } =
    useDisconnectOAuthTokenMutation();
  const [pendingServiceKey, setPendingServiceKey] = useState<string | null>(
    null,
  );

  const metrics = useMemo(
    () => getDashboardMetrics(summaryQuery.data?.metrics),
    [summaryQuery.data?.metrics],
  );

  const issues = useMemo(
    () => getDashboardIssuesFromSummary(summaryQuery.data?.issues),
    [summaryQuery.data?.issues],
  );

  const connectedServices = useMemo(
    () => getConnectedServiceCards(oauthTokensQuery.data),
    [oauthTokensQuery.data],
  );

  const recommendedServices = useMemo(
    () => getRecommendedServiceCards(oauthTokensQuery.data),
    [oauthTokensQuery.data],
  );

  const handleReloadWorkflows = () => {
    void summaryQuery.refetch();
  };

  const handleReloadServices = () => {
    void oauthTokensQuery.refetch();
  };

  const handleConnectService = async (serviceKey: string) => {
    if (!isOAuthConnectSupported(serviceKey)) {
      return;
    }

    setPendingServiceKey(serviceKey);

    try {
      const result = await connectToken(serviceKey);
      if (result.kind === "redirect") {
        storeOAuthConnectReturnPath(getCurrentRelativeUrl());
        window.location.assign(result.authUrl);
        return;
      }

      await oauthTokensQuery.refetch();
      void summaryQuery.refetch();
    } catch {
      // The dashboard keeps its current cards visible when a service action fails.
    } finally {
      setPendingServiceKey(null);
    }
  };

  const handleDisconnectService = async (serviceKey: string) => {
    setPendingServiceKey(serviceKey);

    try {
      await disconnectToken(serviceKey);
      await oauthTokensQuery.refetch();
      void summaryQuery.refetch();
    } catch {
      // The dashboard keeps its current cards visible when a service action fails.
    } finally {
      setPendingServiceKey(null);
    }
  };

  return {
    metrics,
    issues,
    connectedServices,
    recommendedServices,
    isWorkflowsLoading: summaryQuery.isLoading,
    isWorkflowsError: summaryQuery.isError,
    isServicesLoading: oauthTokensQuery.isLoading,
    isServicesError: oauthTokensQuery.isError,
    isServiceActionPending: isConnectPending || isDisconnectPending,
    pendingServiceKey,
    handleReloadWorkflows,
    handleReloadServices,
    handleConnectService,
    handleDisconnectService,
  };
};
