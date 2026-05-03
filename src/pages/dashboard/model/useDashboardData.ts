import { useMemo, useState } from "react";

import {
  isOAuthConnectSupported,
  useConnectOAuthTokenMutation,
  useDisconnectOAuthTokenMutation,
  useOAuthTokensQuery,
} from "@/entities/oauth-token";
import {
  getWorkflowListContent,
  useWorkflowListQuery,
} from "@/entities/workflow";
import { getCurrentRelativeUrl, storeOAuthConnectReturnPath } from "@/shared";

import {
  DASHBOARD_METRICS,
  getConnectedServiceCards,
  getDashboardIssues,
  getRecommendedServiceCards,
  sortWorkflowsByUpdatedAtDesc,
} from "./dashboard";

const DASHBOARD_WORKFLOW_PAGE_SIZE = 20;

export const useDashboardData = () => {
  const workflowQuery = useWorkflowListQuery(0, DASHBOARD_WORKFLOW_PAGE_SIZE);
  const oauthTokenQuery = useOAuthTokensQuery();
  const { mutateAsync: connectToken, isPending: isConnectPending } =
    useConnectOAuthTokenMutation();
  const { mutateAsync: disconnectToken, isPending: isDisconnectPending } =
    useDisconnectOAuthTokenMutation();
  const [pendingServiceKey, setPendingServiceKey] = useState<string | null>(
    null,
  );

  const workflows = useMemo(
    () =>
      sortWorkflowsByUpdatedAtDesc(getWorkflowListContent(workflowQuery.data)),
    [workflowQuery.data],
  );

  const issues = useMemo(() => getDashboardIssues(workflows), [workflows]);

  const connectedServices = useMemo(
    () => getConnectedServiceCards(oauthTokenQuery.data ?? []),
    [oauthTokenQuery.data],
  );

  const recommendedServices = useMemo(
    () => getRecommendedServiceCards(oauthTokenQuery.data ?? []),
    [oauthTokenQuery.data],
  );

  const handleReloadWorkflows = () => {
    void workflowQuery.refetch();
  };

  const handleReloadServices = () => {
    void oauthTokenQuery.refetch();
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

      await oauthTokenQuery.refetch();
    } catch {
      // 대시보드 카드 상태로 현재 연결 가능 여부를 다시 보여준다.
    } finally {
      setPendingServiceKey(null);
    }
  };

  const handleDisconnectService = async (serviceKey: string) => {
    setPendingServiceKey(serviceKey);

    try {
      await disconnectToken(serviceKey);
      await oauthTokenQuery.refetch();
    } catch {
      // 대시보드 카드 상태로 현재 연결 가능 여부를 다시 보여준다.
    } finally {
      setPendingServiceKey(null);
    }
  };

  return {
    metrics: DASHBOARD_METRICS,
    issues,
    connectedServices,
    recommendedServices,
    isWorkflowsLoading: workflowQuery.isLoading,
    isWorkflowsError: workflowQuery.isError,
    isServicesLoading: oauthTokenQuery.isLoading,
    isServicesError: oauthTokenQuery.isError,
    isServiceActionPending: isConnectPending || isDisconnectPending,
    pendingServiceKey,
    handleReloadWorkflows,
    handleReloadServices,
    handleConnectService,
    handleDisconnectService,
  };
};
