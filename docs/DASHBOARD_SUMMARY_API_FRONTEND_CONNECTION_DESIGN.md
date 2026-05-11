# Dashboard Summary API Frontend Connection Design

> 작성일: 2026-05-12
> 대상 저장소: `flowify-FE`
> 기준 Spring API: `GET /api/dashboard/summary`
> 상태: 구현 전 설계 문서

## 1. 목표

대시보드 화면이 기존 mock/파생 데이터 대신 Spring의 `GET /api/dashboard/summary` 응답을 사용하도록 연결한다.

이번 FE 작업의 핵심은 다음 세 가지다.

- Spring dashboard summary 응답 타입과 query를 `entities/dashboard`에 추가한다.
- `pages/dashboard`에서 summary 응답을 기존 카드 UI 모델로 변환한다.
- OAuth 연결/해제 후 dashboard summary를 다시 조회해 화면 상태를 최신화한다.

Spring, FastAPI, Docker 설정은 이 문서의 구현 범위가 아니다.

## 2. 현재 코드 기준 상태

| 영역 | 현재 코드 | 판단 |
| --- | --- | --- |
| metric | `src/pages/dashboard/model/useDashboardData.ts`가 `DASHBOARD_METRICS`를 반환 | 아직 mock 사용 |
| issue | `src/pages/dashboard/model/dashboard.ts`의 `getDashboardIssues()`가 `workflow.warnings`를 사용 | Spring summary issue 미사용 |
| workflow 조회 | `useDashboardData()`가 `useWorkflowListQuery(0, 20)` 호출 | dashboard summary API와 별개 |
| OAuth 조회 | `useDashboardData()`가 `useOAuthTokensQuery()` 호출 | dashboard summary API와 별개 |
| summary API | `/dashboard/summary` 호출 코드 없음 | 신규 query 필요 |
| issue action | `DashboardIssueCardItem`이 `useWorkflowExecutionAction(issue.id)` 호출 | summary issue의 `id`는 workflowId가 아니므로 변경 필요 |

## 3. API 경로 설계

Spring Controller의 실제 endpoint는 `GET /api/dashboard/summary`다.

FE의 기존 API client는 다음 패턴을 사용한다.

- Spring `/api/workflows` -> FE request `url: "/workflows"`
- Spring `/api/oauth-tokens` -> FE request `url: "/oauth-tokens"`

따라서 dashboard summary도 FE에서는 다음처럼 호출한다.

```ts
request<DashboardSummaryResponse>({
  url: "/dashboard/summary",
  method: "GET",
});
```

`VITE_API_BASE_URL`이 이미 Spring의 `/api` base path를 포함한다는 기존 전제를 유지한다. 이 전제를 바꾸면 기존 workflow/oauth API도 같이 깨지므로 dashboard 작업에서 별도 보정하지 않는다.

## 4. Spring 응답 계약

FE에 추가할 타입은 Spring DTO 필드명을 그대로 따른다.

```ts
export type DashboardSummaryResponse = {
  metrics: DashboardMetricsResponse;
  issues: DashboardIssueResponse[];
  services: DashboardServiceResponse[];
};

export type DashboardMetricsResponse = {
  todayProcessedCount: number;
  totalProcessedCount: number;
  totalDurationMs: number;
};

export type DashboardIssueResponse = {
  id: string;
  type: "EXECUTION_FAILED" | "WORKFLOW_NOT_EXECUTABLE" | string;
  workflowId: string;
  workflowName: string | null;
  isActive: boolean;
  startService: string | null;
  endService: string | null;
  occurredAt: string | null;
  message: string | null;
  items: DashboardIssueItemResponse[];
};

export type DashboardIssueItemResponse = {
  id: string;
  service: string | null;
  message: string | null;
};

export type DashboardServiceResponse = {
  service: string | null;
  connected: boolean;
  accountEmail: string | null;
  expiresAt: string | null;
  aliasOf: string | null;
  disconnectable: boolean | null;
  reason: string | null;
};
```

토큰 원문 필드는 추가하지 않는다. `accessToken`, `refreshToken`, `token`, `secret` 계열 필드는 타입에도 mapper에도 포함하지 않는다.

## 5. 신규 파일 설계

`entities/dashboard`를 새로 만든다. API 응답 타입과 query ownership을 dashboard entity가 가진다.

```text
src/entities/dashboard/
  api/
    get-dashboard-summary.api.ts
    index.ts
    types.ts
  model/
    index.ts
    query-keys.ts
    useDashboardSummaryQuery.ts
  index.ts
```

### 5.1 API layer

| 파일 | 역할 |
| --- | --- |
| `src/entities/dashboard/api/types.ts` | Spring dashboard summary 응답 타입 정의 |
| `src/entities/dashboard/api/get-dashboard-summary.api.ts` | `GET /dashboard/summary` request 함수 |
| `src/entities/dashboard/api/index.ts` | `dashboardApi.getSummary` export |

### 5.2 Model layer

| 파일 | 역할 |
| --- | --- |
| `src/entities/dashboard/model/query-keys.ts` | `dashboardKeys.summary()` 정의 |
| `src/entities/dashboard/model/useDashboardSummaryQuery.ts` | React Query hook |
| `src/entities/dashboard/model/index.ts` | model barrel export |
| `src/entities/dashboard/index.ts` | public barrel export |

Query 기본값은 기존 entity hook 패턴과 맞춘다.

```ts
export const dashboardKeys = {
  all: () => ["dashboard"] as const,
  summary: () => [...dashboardKeys.all(), "summary"] as const,
} as const;
```

```ts
export const useDashboardSummaryQuery = (
  options?: QueryPolicyOptions<DashboardSummaryResponse>,
) =>
  useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => dashboardApi.getSummary(),
    enabled: options?.enabled ?? true,
    select: options?.select,
    retry: options?.retry,
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchInterval: options?.refetchInterval,
    placeholderData: options?.placeholderData,
    meta: toQueryMeta(options),
    throwOnError: false,
  });
```

## 6. 기존 dashboard page 변경 설계

### 6.1 `useDashboardData.ts`

기존 `useWorkflowListQuery`와 `useOAuthTokensQuery` 기반 조합을 dashboard summary query 기반으로 바꾼다.

변경 방향:

- `useDashboardSummaryQuery()` 호출
- `summary.metrics` -> `DashboardMetric[]`
- `summary.issues` -> `DashboardIssue[]`
- `summary.services` -> connected/recommended service card
- reload handler는 `summaryQuery.refetch()` 사용
- OAuth connect/disconnect 후에도 `summaryQuery.refetch()` 실행

기존 반환 필드명은 UI 영향 범위를 줄이기 위해 최대한 유지한다.

| 기존 반환값 | 변경 후 원천 |
| --- | --- |
| `metrics` | `summary.metrics` mapper |
| `issues` | `summary.issues` mapper |
| `connectedServices` | `summary.services` mapper |
| `recommendedServices` | `summary.services` + 기존 추천 목록 |
| `isWorkflowsLoading` | `summaryQuery.isLoading` 또는 issue section용 alias |
| `isWorkflowsError` | `summaryQuery.isError` 또는 issue section용 alias |
| `isServicesLoading` | `summaryQuery.isLoading` 또는 service section용 alias |
| `isServicesError` | `summaryQuery.isError` 또는 service section용 alias |

추후 UI 문구를 정리할 때는 `isDashboardLoading`, `isDashboardError`로 이름을 바꾸는 편이 더 정확하다. 다만 이번 API 연결 PR에서는 diff를 줄이기 위해 기존 이름 유지가 안전하다.

### 6.2 `dashboard.ts`

현재 `DASHBOARD_METRICS`는 mock 상수다. summary 연결 후에는 fallback 용도로만 남기거나 제거한다.

추가할 mapper 후보:

- `getDashboardMetrics(metrics: DashboardMetricsResponse): DashboardMetric[]`
- `getDashboardIssuesFromSummary(issues: DashboardIssueResponse[]): DashboardIssue[]`
- `getConnectedServiceCardsFromSummary(services: DashboardServiceResponse[]): DashboardServiceCard[]`
- `getRecommendedServiceCardsFromSummary(services: DashboardServiceResponse[]): DashboardServiceCard[]`
- `formatDurationMs(totalDurationMs: number): string`

Mapping 기준:

| Spring field | FE display model |
| --- | --- |
| `todayProcessedCount` | `DashboardMetric` id `today-processed` |
| `totalProcessedCount` | `DashboardMetric` id `total-processed` |
| `totalDurationMs` | `HH:mm:ss` 형식 문자열 |
| `issue.workflowId` | issue action용 `workflowId` |
| `issue.workflowName` | 카드 제목, null이면 fallback |
| `issue.isActive` | 실행/중지 action 판단 보조 정보로 보관 가능 |
| `issue.startService` | `getServiceBadgeKeyFromService()`로 badge 변환 |
| `issue.endService` | `getServiceBadgeKeyFromService()`로 badge 변환 |
| `issue.occurredAt` | `getRelativeTimeLabel()`로 상대 시간 표시 |
| `issue.items[].service` | item badge 변환 |

`workflow.warnings` 기반 함수는 dashboard summary 연결 이후 대시보드에서는 사용하지 않는다. 단, workflow 목록 화면에서 `warnings`를 쓰는 흐름과는 분리한다.

### 6.3 `types.ts`

현재 `DashboardIssue`에는 `workflowId`가 없다. summary issue의 `id`는 execution id 또는 issue id일 수 있으므로 action에는 사용할 수 없다.

필수 변경:

```ts
export type DashboardIssue = {
  id: string;
  workflowId: string;
  name: string;
  isActive: boolean;
  startBadgeKey: ServiceBadgeKey;
  endBadgeKey: ServiceBadgeKey;
  relativeUpdateLabel: string;
  buildProgressLabel: string;
  items: DashboardIssueItem[];
};
```

`buildProgressLabel`은 기존 UI diff를 줄이기 위해 유지할 수 있다. 다만 summary issue에서는 실제 build progress가 아니므로 mapper에서 issue type label 또는 server message를 넣는다. 추후 UI 정리 시 `metaLabel` 같은 이름으로 바꾸는 것이 더 정확하다.

### 6.4 `DashboardIssueCardItem.tsx`

현재는 다음처럼 issue id를 workflow action에 넘긴다.

```ts
useWorkflowExecutionAction(issue.id);
```

summary API 연결 후에는 반드시 workflow id를 넘긴다.

```ts
useWorkflowExecutionAction(issue.workflowId);
```

이 변경을 하지 않으면 `EXECUTION_FAILED` issue의 id가 execution id일 때 실행/중지 API가 잘못된 workflowId로 호출될 수 있다.

## 7. OAuth 연결/해제 후 refetch 정책

대시보드 화면이 `useOAuthTokensQuery()` 대신 `useDashboardSummaryQuery()`를 사용하면 OAuth action 이후 summary cache도 최신화해야 한다.

권장 정책:

- direct connect 성공: `await summaryQuery.refetch()`
- redirect connect 성공: OAuth callback 후 dashboard return path로 돌아오면 summary query가 mount 시 재조회
- disconnect 성공: `await summaryQuery.refetch()`

기존 `useDisconnectOAuthTokenMutation()`은 `oauthKeys.tokens()`를 invalidate한다. 그러나 dashboard summary cache는 별도 key이므로 dashboard 화면에서는 summary refetch를 추가해야 한다.

## 8. 추천 서비스 정책

Spring `services` 응답은 `OAuthTokenService.getConnectedServices(userId)` 기반이다. 이 응답은 저장된 토큰과 alias 서비스 상태를 중심으로 내려온다.

따라서 추천 서비스 목록은 기존 FE의 `RECOMMENDED_DASHBOARD_SERVICES`를 유지하고, summary `services`에서 connected 또는 alias connected 상태인 service를 제외하는 방식이 안전하다.

규칙:

- `connected === true`인 service는 connected section에 표시
- `connected === false`이고 `aliasOf`/`reason`이 있는 service는 connected section 또는 안내 상태로 표시할지 확인 필요
- recommended section은 기존 정적 추천 목록에서 이미 summary에 존재하는 service를 제외
- `disconnectable === false`인 service는 해제 버튼을 비활성화하거나 숨기는 정책이 필요

`disconnectable === false` UI 처리는 현재 `DashboardServiceCard`가 표현할 필드를 갖고 있지 않으므로 구현 시 타입 확장이 필요하다.

## 9. 구현 순서

1. `entities/dashboard` API 타입/query 추가
2. `pages/dashboard/model/types.ts`에 `workflowId`와 필요한 service action 필드 추가
3. `pages/dashboard/model/dashboard.ts`에 summary mapper 추가
4. `pages/dashboard/model/useDashboardData.ts`를 summary query 기반으로 전환
5. `DashboardIssueCardItem.tsx`에서 `issue.workflowId`를 action hook에 전달
6. OAuth connect/disconnect 후 summary refetch 연결
7. 타입체크/테스트/빌드 검증

추천 커밋:

- `feat: add dashboard summary query and types`
- `feat: map dashboard summary response to dashboard view model`
- `feat: connect dashboard page to summary API`

한 PR로 묶는다면 `feat: connect dashboard page to summary API`가 적절하다.

## 10. 검증 계획

필수 명령:

```powershell
pnpm tsc
pnpm test
pnpm build
```

확인할 동작:

- dashboard page 진입 시 `GET /dashboard/summary`가 1회 호출된다.
- metric 카드가 `DASHBOARD_METRICS` mock이 아닌 summary 값으로 표시된다.
- issue card가 `workflow.warnings`가 아닌 summary `issues`로 표시된다.
- issue action은 `issue.workflowId`로 실행/중지 API를 호출한다.
- OAuth 연결/해제 후 summary가 다시 조회된다.
- `accountEmail: null`이어도 화면이 깨지지 않는다.
- token 원문 필드가 타입, mapper, UI 어디에도 추가되지 않는다.

## 11. 구현 제외 범위

- Spring API 계약 변경
- FastAPI callback 상태 매핑 변경
- Docker 설정 변경
- dashboard UI 대규모 리디자인
- workflow 목록의 `warnings` 표시 방식 변경
- token 원문 표시 또는 저장

## 12. 위험 요소와 대응

| 위험 | 원인 | 대응 |
| --- | --- | --- |
| API path 중복 | FE에서 `/api/dashboard/summary`로 호출 | 기존 패턴대로 `url: "/dashboard/summary"` 사용 |
| mock metric 잔존 | `DASHBOARD_METRICS`를 그대로 반환 | `useDashboardData`에서 summary mapper 반환 |
| issue 누락 | `workflow.warnings` 기반 유지 | `summary.issues` mapper로 전환 |
| 잘못된 실행/중지 호출 | issue id를 workflow id로 착각 | `DashboardIssue.workflowId` 추가 후 action hook에 전달 |
| OAuth refetch 누락 | dashboard summary와 oauth tokens query key가 다름 | action 성공 후 summary refetch |
| alias service UI 불일치 | `disconnectable`, `aliasOf`, `reason`을 기존 card가 표현하지 못함 | card type 확장 또는 V1 표시 정책 확정 |
| accountEmail null 처리 | Spring V1에서 null 가능 | UI에서 직접 표시하지 않거나 fallback 처리 |
| token 노출 | OAuth DTO와 혼동 | dashboard 타입에 token/secret 필드 금지 |

## 13. 확인 필요 사항

- `disconnectable === false`인 alias service를 connected section에 표시할지, 별도 안내 상태로 표시할지
- `connected === false`이면서 `reason`이 있는 service의 action label을 어떻게 표현할지
- issue `buildProgressLabel`을 유지할지, `metaLabel`로 이름을 정리할지
- metric count 표시를 `toLocaleString()`으로 할지 단순 문자열 변환으로 할지
- duration이 24시간을 넘을 때 `HH:mm:ss`를 누적 시간으로 표시할지, `n일 HH:mm:ss`로 표시할지

## 14. 3회 자체 검토 결과

### 1차 검토 - 실제 코드 경로 대조

- `src/entities/dashboard`는 현재 존재하지 않으므로 신규 slice 설계가 필요함을 확인했다.
- 기존 workflow/oauth API가 `"/workflows"`, `"/oauth-tokens"`로 호출되므로 dashboard도 `"/dashboard/summary"`가 맞다.
- `DASHBOARD_METRICS`, `workflow.warnings`, `useWorkflowListQuery`, `useOAuthTokensQuery` 사용 위치를 실제 파일 기준으로 확인했다.

### 2차 검토 - 데이터 계약 충돌 점검

- Spring `DashboardIssueResponse.id`는 workflow id가 아니므로 `DashboardIssue.workflowId`가 별도 필요하다.
- `accountEmail`은 기존 `OAuthTokenSummary`와 동일하게 `string | null`이어서 nullable 정책 충돌은 없다.
- token 원문 필드는 Spring dashboard DTO에 없고 FE 신규 타입에도 추가하지 않는 것으로 정리했다.

### 3차 검토 - 구현 범위와 캐시 영향 점검

- FE 외 Spring/FastAPI/Docker 수정은 이 설계에서 제외했다.
- dashboard summary query key는 기존 `oauthKeys.tokens()`와 별도이므로 OAuth action 후 summary refetch가 필요함을 반영했다.
- 추천 서비스는 Spring summary만으로 전체 후보를 만들 수 없으므로 기존 FE 추천 목록을 유지하는 방향으로 정리했다.
