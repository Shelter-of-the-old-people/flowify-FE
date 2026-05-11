import { describe, expect, it } from "vitest";

import {
  getConnectedServiceCardsFromSummary,
  getDashboardIssuesFromSummary,
  getDashboardMetrics,
  getRecommendedServiceCardsFromSummary,
} from "./dashboard";

describe("dashboard summary mappers", () => {
  it("maps summary metrics to dashboard metric cards", () => {
    const metrics = getDashboardMetrics({
      todayProcessedCount: 3,
      totalProcessedCount: 21,
      totalDurationMs: 3_723_000,
    });

    expect(metrics).toEqual([
      {
        id: "today-processed",
        label: "오늘 처리량",
        value: "3",
      },
      {
        id: "total-processed",
        label: "누적 처리량",
        value: "21",
      },
      {
        id: "total-duration",
        label: "누적 실행 시간",
        value: "01:02:03",
      },
    ]);
  });

  it("maps summary issues with workflowId and service badges", () => {
    const issues = getDashboardIssuesFromSummary([
      {
        id: "exec_1",
        type: "EXECUTION_FAILED",
        workflowId: "workflow_1",
        workflowName: "Mail summary",
        isActive: true,
        startService: "gmail",
        endService: "slack",
        occurredAt: "2026-05-12T10:15:00Z",
        message: "Gmail node execution failed",
        items: [
          {
            id: "exec_1-node_1",
            service: "gmail",
            message: "Gmail auth failed",
          },
        ],
      },
    ]);

    expect(issues[0]).toMatchObject({
      id: "exec_1",
      workflowId: "workflow_1",
      name: "Mail summary",
      isActive: true,
      startBadgeKey: "gmail",
      endBadgeKey: "slack",
      buildProgressLabel: "Gmail node execution failed",
    });
    expect(issues[0]?.items[0]).toMatchObject({
      id: "exec_1-node_1",
      badgeKey: "gmail",
      message: "Gmail auth failed",
    });
  });

  it("maps connected services and excludes them from recommendations", () => {
    const services = [
      {
        service: "gmail",
        connected: true,
        accountEmail: null,
        expiresAt: null,
        aliasOf: null,
        disconnectable: true,
        reason: null,
      },
    ];

    const connectedServices = getConnectedServiceCardsFromSummary(services);
    const recommendedServices = getRecommendedServiceCardsFromSummary(services);

    expect(connectedServices[0]).toMatchObject({
      id: "connected-gmail",
      badgeKey: "gmail",
      serviceKey: "gmail",
      actionKind: "disconnect",
    });
    expect(
      recommendedServices.map((service) => service.serviceKey),
    ).not.toContain("gmail");
  });

  it("marks alias services as non-disconnectable", () => {
    const services = [
      {
        service: "google_sheets",
        connected: true,
        accountEmail: null,
        expiresAt: null,
        aliasOf: "google_drive",
        disconnectable: false,
        reason: null,
      },
    ];

    const connectedServices = getConnectedServiceCardsFromSummary(services);

    expect(connectedServices[0]).toMatchObject({
      serviceKey: "google_sheets",
      statusLabel: "google_drive 연결 사용",
      actionLabel: "해제 불가",
      actionDisabled: true,
    });
  });
});
