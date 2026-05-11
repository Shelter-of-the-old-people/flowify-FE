import { useMemo, useState } from "react";

import {
  isOAuthConnectSupported,
  useConnectOAuthTokenMutation,
  useDashboardSummaryQuery,
  useDisconnectOAuthTokenMutation,
} from "@/entities";
import { getCurrentRelativeUrl, storeOAuthConnectReturnPath } from "@/shared";

import {
  getConnectedServiceCardsFromSummary,
  getDashboardIssuesFromSummary,
  getDashboardMetrics,
  getRecommendedServiceCardsFromSummary,
} from "./dashboard";

export const useDashboardData = () => {
  const summaryQuery = useDashboardSummaryQuery();
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
    () => getConnectedServiceCardsFromSummary(summaryQuery.data?.services),
    [summaryQuery.data?.services],
  );

  const recommendedServices = useMemo(
    () => getRecommendedServiceCardsFromSummary(summaryQuery.data?.services),
    [summaryQuery.data?.services],
  );

  const handleReloadWorkflows = () => {
    void summaryQuery.refetch();
  };

  const handleReloadServices = () => {
    void summaryQuery.refetch();
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

      await summaryQuery.refetch();
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
      await summaryQuery.refetch();
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
    isServicesLoading: summaryQuery.isLoading,
    isServicesError: summaryQuery.isError,
    isServiceActionPending: isConnectPending || isDisconnectPending,
    pendingServiceKey,
    handleReloadWorkflows,
    handleReloadServices,
    handleConnectService,
    handleDisconnectService,
  };
};
